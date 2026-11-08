## D1
on: M3
assumed: a
Whether a stale price older than three blocks is still a price at all. The prose caps stale at 3 and keeps counting nothing.
Walk a: from Stale, tick, tick, tick, post-a; ends Fresh with stale 0.
Walk b: from Stale, tick, tick, tick; ends Stale and the price is void until a post.
Assumed a, because the Vault reads the price regardless of its age and the lanes are prompt.
