"""Regressions for CSS URLs found in the original Bagwan Bootstrap stylesheet."""
import unittest
from export_static import rewrite_css, SOURCE


class ExportCssTests(unittest.TestCase):
    def test_svg_parentheses_preserve_following_layout_rules(self):
        css = '''.navbar-toggler-icon {background-image:url("data:image/svg+xml,%3Csvg stroke='rgba(0,0,0,0.5)'%3E%3C/svg%3E");}
.p-4 {padding:1.5rem!important;}.shadow {box-shadow:0 .5rem 1rem #0003;}'''
        self.assertEqual(rewrite_css(css, SOURCE), css)

    def test_single_quoted_svg_with_double_quoted_attributes_is_preserved(self):
        css = '''.icon{background:url('data:image/svg+xml,<svg fill="rgba(1,2,3,.5)"></svg>')}'''
        self.assertEqual(rewrite_css(css, SOURCE), css)

    def test_excluded_font_import_does_not_import_the_stylesheet_itself(self):
        css = '@import url("https://fonts.googleapis.com/css?family=Roboto");\n.p-4{padding:24px}'
        self.assertEqual(rewrite_css(css, SOURCE).strip(), '.p-4{padding:24px}')

    def test_normal_asset_url_is_still_localized(self):
        css = '.icon{background:url("../images/icon.png")}'
        result = rewrite_css(css, SOURCE + 'wp-content/themes/118/css/main.css')
        self.assertEqual(result, '.icon{background:url("/Bagwan2.0/wp-content/themes/118/images/icon.png")}')


if __name__ == '__main__':
    unittest.main()
