#!/usr/bin/env python3
"""Verify migrated file bytes, document containers and original Drive link coverage."""
import hashlib
import json
from pathlib import Path
from urllib.parse import quote
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]


def require(condition, message):
    if not condition:
        raise ValueError(message)


def main():
    manifest = json.loads((ROOT / 'documents/manifest.json').read_text())
    link_map = json.loads((ROOT / 'documents/source-link-map.json').read_text())
    files = {f['id']: f for f in manifest['files']}
    folders = {f['id']: f for f in manifest['folders']}
    require(len(files) == len(manifest['files']), 'Duplicate source file IDs')
    require(len(folders) == len(manifest['folders']), 'Duplicate source folder IDs')
    require(len({f['local_path'] for f in files.values()}) == len(files), 'Duplicate local paths')

    for f in files.values():
        label = f['local_path']
        path = (ROOT / label).resolve()
        require(path.is_relative_to(ROOT), 'Path escapes repository: ' + label)
        require(path.is_file(), 'Missing file: ' + label)
        data = path.read_bytes()
        require(len(data) == f['size_bytes'], 'Byte size mismatch: ' + label)
        require(hashlib.sha256(data).hexdigest() == f['sha256'], 'SHA-256 mismatch: ' + label)
        require(not data.startswith(b'version https://git-lfs.github.com/spec/v1'), 'Unresolved LFS pointer: ' + label)
        require(f['local_href'] == quote(label, safe='/'), 'Incorrect URL encoding: ' + label)
        if f['source_size_bytes'] is not None:
            require(len(data) == f['source_size_bytes'], 'Original Drive size mismatch: ' + label)
        if f['kind'] == 'office-lock-file':
            require(f['archived'] and path.name.startswith('~$') and label.startswith('archive/'), 'Lock file is not archived: ' + label)
            continue
        require(not f['archived'], 'Unexpected archived document: ' + label)
        suffix = path.suffix.lower()
        if suffix == '.docx':
            with ZipFile(path) as archive:
                require('[Content_Types].xml' in archive.namelist() and 'word/document.xml' in archive.namelist(), 'Invalid Word document: ' + label)
                require(archive.testzip() is None, 'Invalid ZIP checksum: ' + label)
        elif suffix == '.pdf':
            require(data.startswith(b'%PDF-'), 'Invalid PDF header: ' + label)
        elif suffix == '.doc':
            require(data.startswith(bytes.fromhex('D0CF11E0A1B11AE1')), 'Invalid Word binary header: ' + label)
        elif suffix == '.png':
            require(data.startswith(b'\x89PNG\r\n\x1a\n'), 'Invalid PNG header: ' + label)
        elif suffix == '.ai':
            require(data.startswith((b'%PDF-', b'%!PS-Adobe')), 'Invalid Illustrator header: ' + label)
        else:
            raise ValueError('Unchecked file type: ' + label)
        if f['kind'] == 'google-doc-export':
            require(f['source_mime_type'] == 'application/vnd.google-apps.document' and suffix == '.docx' and f['export_mime_type'] == f['mime_type'], 'Invalid Google Docs export metadata: ' + label)
        if f['kind'] == 'shortcut-copy':
            require(f['shortcut_target_id'] in files, 'Missing shortcut target: ' + label)
            target = files[f['shortcut_target_id']]
            require(f['sha256'] == target['sha256'] and f['size_bytes'] == target['size_bytes'], 'Shortcut target differs: ' + label)
        for source_folder in f['source_folder_ids']:
            require(source_folder in folders and f['id'] in folders[source_folder]['file_ids'], 'Incorrect folder membership: ' + label)

    for folder in folders.values():
        require((ROOT / folder['local_path']).is_dir(), 'Missing folder: ' + folder['local_path'])
        require(all(child in files for child in folder['file_ids']), 'Unmigrated folder file: ' + folder['name'])
        require(all(child in folders for child in folder['folder_ids']), 'Unmigrated child folder: ' + folder['name'])
        require(all(parent in folders and folder['id'] in folders[parent]['folder_ids'] for parent in folder['parent_ids']), 'Incorrect folder parent: ' + folder['name'])

    for page in link_map['pages']:
        for link in page['links']:
            targets = files if link['target_type'] == 'file' else folders
            require(link['target_id'] in targets, 'Unmigrated Drive link: ' + link['source_url'])
            target = targets[link['target_id']]
            require(link['local_path'] == target['local_path'], 'Incorrect link destination: ' + link['source_url'])
            require(link['local_href'] == target.get('local_href'), 'Incorrect encoded destination: ' + link['source_url'])

    summary = manifest['summary']
    require(summary['repository_file_copy_count'] == len(files), 'Incorrect total file count')
    require(summary['unique_source_file_count'] == sum(f['kind'] != 'shortcut-copy' for f in files.values()), 'Incorrect unique source count')
    require(summary['source_drive_folder_count'] == len(folders), 'Incorrect source folder count')
    require(summary['materialized_shortcut_count'] == sum(f['kind'] == 'shortcut-copy' for f in files.values()), 'Incorrect shortcut count')
    require(summary['native_google_doc_export_count'] == sum(f['kind'] == 'google-doc-export' for f in files.values()), 'Incorrect export count')
    require(summary['archived_office_lock_file_count'] == sum(f['archived'] for f in files.values()), 'Incorrect archive count')
    require(summary['total_payload_bytes'] == sum(f['size_bytes'] for f in files.values()), 'Incorrect payload size')
    require(summary['largest_file_bytes'] == max(f['size_bytes'] for f in files.values()), 'Incorrect maximum size')
    require(summary['site_pages_with_drive_links'] == len(link_map['pages']), 'Incorrect source page count')
    require(summary['unique_site_drive_links'] == len({link['source_url'] for page in link_map['pages'] for link in page['links']}), 'Incorrect source URL count')
    payload_paths = {p.relative_to(ROOT).as_posix() for base in ('documents', 'archive') for p in (ROOT / base).rglob('*') if p.is_file() and p.suffix.lower() not in ('.json', '.md', '.html')}
    require(payload_paths == {f['local_path'] for f in files.values()}, 'Unlisted or missing payload files')
    print(f"Verified {len(files)} file copies ({summary['unique_source_file_count']} unique Drive files + {summary['materialized_shortcut_count']} shortcut copies).")
    print(f"All sizes, SHA-256 hashes, document signatures, folder memberships and {summary['unique_site_drive_links']} source URL mappings passed.")


if __name__ == '__main__':
    main()
