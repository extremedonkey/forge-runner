// Build-target flags, injected into the <head> of the page shell (client/shell.html, placeholder {{HEAD}}).
// site (Lambda / forgerunnergames.com, server/page.mjs): only FR_BUILD='site'. No Poki SDK, no ads adapter, ads OFF
// (FR_ADS_CONFIG absent). The Poki head lives in build-flags-poki.mjs so none of it reaches the Lambda bundle.
// The game itself does not read these yet (no gameplay hooks in POKI-1); later PRs branch on window.FR_BUILD.
export const SITE_HEAD = "<script>window.FR_BUILD='site'</script>";
