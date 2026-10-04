async function testCSS() {
  const res = await fetch('http://localhost:3000');
  const html = await res.text();
  console.log('HTML length:', html.length);
  const cssMatches = [...html.matchAll(/href="(\/_next\/static\/css\/[^"]+)"/g)].map(m => m[1]);
  console.log('CSS links found in HTML:', cssMatches);

  for (const link of cssMatches) {
    const cssRes = await fetch('http://localhost:3000' + link);
    const css = await cssRes.text();
    console.log(`\nCSS File [${link}]:`);
    console.log('Length:', css.length);
    console.log('Has #F4F0E6 (bg-paper):', css.includes('#F4F0E6') || css.includes('244 240 230'));
    console.log('Has #FFE600 (acid-yellow):', css.includes('#FFE600') || css.includes('255 230 0'));
    console.log('Has 4px 4px 0px (brutal shadow):', css.includes('4px 4px 0px') || css.includes('shadow'));
    console.log('Has border-3 / border-4:', css.includes('border-width:3px') || css.includes('border-width: 3px') || css.includes('border-3'));
  }
}
testCSS().catch(console.error);
