"""Regressions for generated library links being resolved against eMedia."""
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
import json
import unittest

from bs4 import BeautifulSoup
from export_static import document_list, FOLDERS, local_link, queue_asset, SOURCE
from repair_links import localize_exported_url, repair_exported_links
import verify_static


class ExportLinkTests(unittest.TestCase):
    def test_generated_links_survive_the_second_export_pass(self):
        for folder_id in FOLDERS:
            soup = BeautifulSoup(document_list(folder_id), 'html.parser')
            for anchor in soup.select('a[href]'):
                href = anchor['href']
                self.assertEqual(local_link(href, SOURCE + 'scorm/intranet/staff-repository/'), href)

    def test_source_host_export_paths_become_local_without_losing_url_parts(self):
        path = '/Bagwan2.0/documents/administration/With%20Compliments.docx?download=1#example'
        for origin in ('https://emedia.rmit.edu.au', 'http://emedia.rmit.edu.au', '//EMEDIA.RMIT.EDU.AU'):
            self.assertEqual(local_link(origin + path, SOURCE), path)
            self.assertEqual(queue_asset(origin + path, SOURCE), path)

    def test_other_hosts_and_projects_are_preserved(self):
        for value in ('https://example.com/Bagwan2.0/example.pdf',
                      'https://emedia.rmit.edu.au/another-project/example.pdf'):
            self.assertEqual(localize_exported_url(value), value)

    def test_custom_export_base(self):
        self.assertEqual(localize_exported_url('https://emedia.rmit.edu.au/pilot/documents/a.pdf', '/pilot/'),
                         '/pilot/documents/a.pdf')

    def test_source_urls_are_not_mistaken_for_generated_root_paths(self):
        value = SOURCE + 'scorm/intranet/'
        self.assertEqual(localize_exported_url(value, '/'), value)

    def test_legacy_interpreting_tour_button_uses_the_existing_local_page(self):
        for path in ('index.php/scorm/department-pages/interpreting-service',
                     'scorm/department-pages/interpreting-service/'):
            self.assertEqual(local_link(SOURCE + path, SOURCE),
                             '/Bagwan2.0/scorm/department-pages/interpreting-office/index.html')

    def test_existing_pages_can_be_repaired_without_network_requests(self):
        soup = BeautifulSoup('<a href="https://emedia.rmit.edu.au/Bagwan2.0/documents/administration/meeting-agenda.pdf">Agenda</a>', 'html.parser')
        self.assertTrue(repair_exported_links(soup))
        self.assertEqual(soup.a['href'], '/Bagwan2.0/documents/administration/meeting-agenda.pdf')
        self.assertFalse(repair_exported_links(soup))

    def test_verifier_rejects_the_exported_source_host_variant(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'index.html').write_text('<!DOCTYPE html><html><head><title>Documents</title></head><body><a href="https://emedia.rmit.edu.au/Bagwan2.0/documents/administration/meeting-agenda.pdf">Agenda</a></body></html>')
            with patch.object(verify_static, 'ROOT', root):
                _, errors = verify_static.inspect()
            self.assertTrue(any('Unconverted URL:' in error for _, error in errors))

    def test_verifier_checks_tour_button_destinations(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            path = root / 'VR/public/static_assets/hello-world.json'
            path.parent.mkdir(parents=True)
            path.write_text(json.dumps({'scenes':[{'buttons':[{'uri':SOURCE + 'old-page/'}]}]}))
            with patch.object(verify_static, 'ROOT', root):
                _, errors = verify_static.inspect()
            self.assertTrue(any('Unconverted URL:' in error for _, error in errors))


if __name__ == '__main__':
    unittest.main()
