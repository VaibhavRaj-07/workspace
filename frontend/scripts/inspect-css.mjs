async function inspectCSS() {
  const res = await fetch('http://localhost:3000');
  const html = await res.text();
  const cssMatches = [...html.matchAll(/href="(\/_next\/static\/css\/[^"]+)"/g)].map(m => m[1]);
  if (cssMatches.length > 0) {
    const cssRes = await fetch('http://localhost:3000' + cssMatches[0]);
    const css = await cssRes.text();
    console.log('--- CSS DUMP START (first 2000 chars) ---');
    console.log(css.slice(0, 2000));
    console.log('--- CSS DUMP END ---');
    console.log('Matches for bg-:');
    const bgMatches = css.match(/\.bg-[a-zA-Z0-9_-]+/g);
    console.log(bgMatches ? [...new Set(bgMatches)].slice(0, 30) : 'None');
    console.log('Matches for text-:');
    const textMatches = css.match(/\.text-[a-zA-Z0-9_-]+/g);
    console.log(textMatches ? [...new Set(textMatches)].slice(0, 30) : 'None');
  }
}
inspectCSS();
