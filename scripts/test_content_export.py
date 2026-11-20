"""Check migration gaps that previously produced broken learning journeys."""
from pathlib import Path
import json
import unittest
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]


def page(path):
    return BeautifulSoup((ROOT / path).read_text(), 'lxml')


class ContentExportTests(unittest.TestCase):
    def test_original_youtube_players_survive_export(self):
        expected = {'s9N4BsPuBnk', 'l3iT30eQlwY', 'VGCKcsdSngM', 'FdlWSEsw-So', 'eikmfDb7UHM', 'vTdrE-V_i6s', 'Fv5IgjDsofs', 'aI5AIkYL3cc', 'q8rQ559UqqA', 'QDvZ_gri_UY', 'YB_UTHG0vjg', 'Wut1CWc7E1I'}
        videos = json.loads((ROOT / 'data/videos.json').read_text())
        recovered = json.loads((ROOT / 'data/recovered-galleries.json').read_text())['galleries']
        expected.update(v['youtube_id'] for g in recovered for v in g['videos'])
        self.assertEqual(len(videos), 24)
        self.assertEqual({v['youtube_id'] for v in videos}, expected)
        for video in videos:
            frames = page(video['source_page']).select('iframe.youtube-video')
            self.assertTrue(any('/embed/' + video['youtube_id'] in f['src'] for f in frames))

    def test_recovered_galleries_are_present_in_their_original_locations(self):
        for relative, selector, count in (
            ('scorm/department-pages/hr-services/index.html', '[data-recovered-gallery="1"]', 11),
            ('scorm/intranet/resources/index.html', '#Humanresources [data-recovered-gallery="1"]', 11),
            ('scorm/intranet/resources/index.html', '#ATSIliaisonservices [data-recovered-gallery="2"]', 1),
        ):
            soup = page(relative)
            gallery = soup.select_one(selector)
            self.assertIsNotNone(gallery)
            self.assertEqual(len(gallery.select('iframe.youtube-video')), count)
            self.assertEqual(len(gallery.select('a[href^="https://www.youtube.com/watch"]')), count)
            self.assertNotIn('original departmental video playlist is unavailable', soup.get_text())

    def test_missing_policy_templates_are_not_presented_as_completed_policies(self):
        for slug in ('medication-safety', 'nursing-and-clinical-handover'):
            soup = page('scorm/quick-link-pages/policy-and-procedures/' + slug + '/index.html')
            self.assertIsNotNone(soup.select_one('article .static-site-notice'))
            self.assertNotIn('Policy Number', soup.article.get_text())

    def test_staff_entries_are_backed_by_published_chart_names(self):
        records = json.loads((ROOT / 'data/staff-directory.json').read_text())
        self.assertEqual(len(records), 40)
        for record in records:
            text = page(record['source_page']).get_text(' ', strip=True)
            self.assertIn(record['name'], text)
            self.assertIn(record['role'], text)

    def test_doctor_profile_controls_resolve_to_named_dialogs(self):
        soup = page('scorm/intranet/doctors-on-call/index.html')
        controls = soup.select('[data-profile-dialog]')
        self.assertEqual(len(controls), 4)
        for control in controls:
            dialog = soup.find('dialog', id=control['data-profile-dialog'])
            self.assertIsNotNone(dialog)
            self.assertIsNotNone(soup.find(id=dialog['aria-labelledby']))
            self.assertIsNotNone(dialog.select_one('a[href^="mailto:"]'))


if __name__ == '__main__':
    unittest.main()
