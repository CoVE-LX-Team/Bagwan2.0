"""Restore the metadata visible in the five supplied Word policy copies."""
import re


POLICIES = {
    'complaints-and-feedback-handling', 'freedom-of-information',
    'internet-email-and-social-media', 'interpretinglanguage-services-rights-and-responsibilities',
    'mandatory-reporting',
}


def render_metadata(path, content):
    parts = path.split('/')
    if len(parts) > 1 and parts[-2] in POLICIES:
        # Each matching Word file says "Version Number 001" and gives no policy number.
        return re.sub(
            r'<h[2-4]>Policy Number</h[2-4]>\s*<h[2-4]>Version Number</h[2-4]>',
            '<dl class="policy-metadata"><dt>Document version</dt><dd>001</dd></dl>',
            content, count=1,
        )
    return content
