export function buildFeedX({ generatedAt, lookbackHours, accounts }) {
  return {
    generatedAt,
    lookbackHours,
    x: accounts,
    stats: {
      xBuilders: accounts.filter((account) => (account.tweets || []).length > 0).length,
      totalTweets: accounts.reduce((sum, account) => sum + (account.tweets || []).length, 0),
    },
  };
}
