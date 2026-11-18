"""Keep generated site links on the current host instead of the source host."""
from urllib.parse import urlsplit, urlunsplit


def localize_exported_url(value, base='/Bagwan2.0/'):
    parsed = urlsplit(value)
    if parsed.hostname == 'emedia.rmit.edu.au':
        # The tour used an old singular slug for the current interpreting page.
        source_path = parsed.path.replace('/bagwanhealth/index.php/', '/bagwanhealth/').rstrip('/')
        if source_path == '/bagwanhealth/scorm/department-pages/interpreting-service':
            path = base + 'scorm/department-pages/interpreting-office/index.html'
            return urlunsplit(('', '', path, parsed.query, parsed.fragment))
        # '/' is ambiguous with original source URLs; only match a project base.
        if base != '/' and parsed.path.startswith(base):
            return urlunsplit(('', '', parsed.path, parsed.query, parsed.fragment))
    return value


def repair_exported_links(soup, base='/Bagwan2.0/'):
    changed = False
    for tag in soup.find_all(True):
        for attr in ('href', 'src', 'poster', 'data-src', 'data', 'action'):
            value = tag.get(attr)
            if not isinstance(value, str):
                continue
            local = localize_exported_url(value, base)
            if local != value:
                tag[attr] = local
                changed = True
    return changed
