"""Prevent loss of form data when repairing the original malformed grid."""
import unittest
from bs4 import BeautifulSoup
from repair_accessibility import repair_accessibility_markup


class AccessibilityRepairTests(unittest.TestCase):
    def setUp(self):
        self.soup = BeautifulSoup('''<!doctype html><html lang="en"><head><title>Continence</title></head>
        <body class="patient-system"><div class="page"><legend>Continence record</legend>
        <table><thead><tr><th>Time</th><th>Date</th></tr></thead><tbody class="continence">
        <tr><td></td><td><input type="date" value="2027-07-12"></td></tr>
        <div class="highlight"><tr></tr><td><input disabled value="00:00"></td>
        <td><select><option value="1">One</option><option value="2">Two</option></select><textarea>ID 1</textarea></td>
        <tr></tr><td><input disabled value="01:00"></td>
        <td><select><option value="1">One</option><option value="2" selected>Two</option></select><textarea>ID 2</textarea></td>
        </div></tbody></table></div></body></html>''', 'lxml')

    def signature(self):
        return [(field.name, field.get('value'), field.get_text(),
                 [(option.get('value'), option.get('selected')) for option in field.select('option')])
                for field in self.soup.select('input,select,textarea')]

    def test_grid_repair_preserves_values_options_and_control_order(self):
        before = self.signature()
        repair_accessibility_markup(self.soup)
        self.assertEqual(before, self.signature())
        rows = self.soup.select('tbody.continence > tr')
        self.assertEqual(len(rows), 3)
        self.assertTrue(all(len(row.find_all('td', recursive=False)) == 2 for row in rows))
        self.assertFalse(self.soup.select('tbody.continence > td,tbody.continence > div'))
        self.assertEqual(self.soup.select('select')[1]['aria-label'], 'Continence record - day 1, 01:00')
        self.assertEqual(self.soup.select('textarea')[1]['aria-label'], 'Staff ID - day 1, 01:00')

    def test_reapplying_repairs_does_not_duplicate_labels_or_landmarks(self):
        repair_accessibility_markup(self.soup)
        self.assertFalse(repair_accessibility_markup(self.soup))
        ids = [field['id'] for field in self.soup.select('input,select,textarea')]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(len(self.soup.select('main')), 1)
        self.assertEqual(len(self.soup.select('.skip-to-content')), 1)


if __name__ == '__main__':
    unittest.main()
