const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('server/wu_hsin.html', 'utf8');
const $ = cheerio.load(html);
const quotes = [];
$('p').each((i, el) => {
  const text = $(el).text();
  if (text.length > 30 && !text.includes('Subscribe') && !text.includes('Farnam Street')) {
    quotes.push(text.trim());
  }
});
fs.writeFileSync('src/lib/wu_quotes.json', JSON.stringify(quotes.slice(5, 50), null, 2));
