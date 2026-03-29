function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderImages(images = []) {
  if (images.length === 0) return "";

  const items = images
    .map((image) => {
      const alt = escapeHtml(image.alt || "");
      const src = escapeHtml(`../../${image.localPath}`);
      return `<img src="${src}" alt="${alt}" loading="lazy" />`;
    })
    .join("");

  return `<div class="tweet-images">${items}</div>`;
}

function renderTweet(tweet) {
  return `
    <article class="tweet">
      <div class="tweet-meta">
        <time datetime="${escapeHtml(tweet.createdAt)}">${escapeHtml(tweet.createdAt)}</time>
        <a href="${escapeHtml(tweet.url)}" target="_blank" rel="noreferrer">Original</a>
      </div>
      <p class="tweet-text">${escapeHtml(tweet.text)}</p>
      ${renderImages(tweet.images)}
      <div class="tweet-stats">Likes ${Number(tweet.likes || 0)} · Retweets ${Number(tweet.retweets || 0)}</div>
    </article>
  `;
}

export function renderAccountHtml(account) {
  const tweets = (account.tweets || []).map(renderTweet).join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(account.name)} @${escapeHtml(account.handle)} ${escapeHtml(account.date)}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 24px; line-height: 1.5; }
      .tweet { border: 1px solid #ddd; border-radius: 12px; padding: 16px; margin: 16px 0; }
      .tweet-meta { display: flex; gap: 12px; font-size: 14px; color: #555; margin-bottom: 8px; }
      .tweet-images { display: grid; gap: 12px; margin: 12px 0; }
      .tweet-images img { max-width: 100%; border-radius: 12px; }
      .tweet-stats { font-size: 13px; color: #666; }
    </style>
  </head>
  <body>
    <header>
      <h1>${escapeHtml(account.name)}</h1>
      <p>@${escapeHtml(account.handle)}</p>
      <p>Date: ${escapeHtml(account.date)}</p>
      <p>Generated: ${escapeHtml(account.generatedAt)}</p>
      <p>Tweets: ${(account.tweets || []).length}</p>
    </header>
    <main>
      ${tweets || "<p>No tweets archived for this day.</p>"}
    </main>
  </body>
</html>`;
}
