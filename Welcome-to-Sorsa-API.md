> ## Documentation Index
> Fetch the complete documentation index at: https://docs.sorsa.io/llms.txt
> Use this file to discover all available pages before exploring further.

# Welcome to Sorsa API

> ## Building with an LLM or AI coding agent?
>
> LLM-friendly docs: [**llms-docs**](https://api.sorsa.io/v3/static/sorsa_api_v3_documentation_en.txt) - paste this into ChatGPT, Claude, Gemini, Grok, Cursor or any AI assistant for full API context.

# Welcome to Sorsa API

Sorsa API gives you fast, structured access to public X (formerly Twitter) data through a simple REST interface. It covers user profiles, tweets, search, follower graphs, community content, and crypto-related audience analytics - all through a single API key, with no OAuth, no app approval, and no rate limit surprises.

Think of it as a reliable X data scraper you don't have to build or maintain yourself: a managed alternative to the official Twitter API, designed for developers, data engineers, analysts, researchers, growth teams, and AI product builders who want to extract, monitor, and analyze public X content at scale.

***

## Who is Sorsa API for?

Sorsa is built for anyone who needs programmatic access to X platform data. You do not need an official X developer account, Twitter API approval, or complex OAuth setup to get started.

Common profiles include backend developers building social data pipelines, data scientists running sentiment analysis, growth marketers tracking brand mentions, Web3 teams verifying community engagement, no-code builders connecting X data to automation tools like Make or Zapier, and AI engineers collecting training datasets from public conversations.

***

## Quick start

**Base URL**

```text theme={null}
https://api.sorsa.io/v3
```

**Authentication**

Include your API key in the `ApiKey` header with every request. That's it - no OAuth flows, no bearer tokens, no callback URLs.

**Response format**

All endpoints return JSON.

**Example request**

```text theme={null}
curl -X GET "https://api.sorsa.io/v3/info?username=elonmusk" \
  -H "ApiKey: YOUR_API_KEY"
```

New here? Follow the [Quickstart guide](https://docs.sorsa.io/quickstart) to get your API key and send your first request in under three minutes.

***

## What you can do with Sorsa API

Sorsa API currently offers **38 endpoints** organized into eight categories. Below is a practical overview of each one. For full request/response schemas, parameters, and examples, see the [API Reference](https://docs.sorsa.io/api-reference).

***

### 👤 Users

Retrieve detailed user profiles, audience data, and social graph relationships.

`GET /info` returns core profile data: display name, bio, follower and following counts, account creation date, and verification status. For batch lookups, use `GET /info-batch` to query multiple accounts in a single request.

`GET /about` provides extended profile metadata, including country, username change history, and verification details.

`GET /followers` and `GET /follows` return paginated lists of a user's followers and the accounts they follow. `GET /verified-followers` filters to only verified accounts.

***

### 🐦 Tweets

Access tweet content, engagement metrics, threads, and full user timelines.

`POST /tweet-info` returns complete data for a single tweet by URL or ID, including text, media attachments, metrics, and thread context. `POST /tweet-info-bulk` does the same for up to 100 tweets per request - ideal for bulk tweet scraping and large-scale data collection.

`POST /user-tweets` retrieves a user's tweet timeline with pagination support.

`POST /comments` returns replies under a specific tweet. `POST /quotes` returns quote tweets, and `POST /retweets` returns the list of users who retweeted a given tweet.

`POST /article` retrieves data from long-form X Articles (formerly Twitter Articles) by URL.

***

### 🔍 Search

Run advanced queries across tweets and users, similar to the X Advanced Search interface.

`POST /search-tweets` supports the full range of [search operators](https://docs.sorsa.io/search-operators): keywords, exact phrases, date ranges, minimum engagement thresholds, language filters, and more. This is the most powerful endpoint for tweet scraping, keyword monitoring, and historical data extraction. You can also build complex queries visually using the free [Search Builder](https://api.sorsa.io/playground/search-builder) tool.

`POST /search-users` finds user accounts by keyword - useful for influencer discovery, competitor research, and building targeted account lists.

`POST /mentions` searches for all tweets that mention a specific account, making it the go-to endpoint for brand monitoring, social listening, and reputation tracking.

***

### 📋 Lists

Access content and membership data from public X Lists.

`GET /list-tweets` returns the tweet feed from a list. `GET /list-members` returns the accounts in a list, and `GET /list-followers` returns the accounts following a list.

***

### 👥 Communities

Retrieve content and membership data from X Communities.

`POST /community-tweets` returns the community tweet feed. `POST /community-members` returns the member list. `POST /community-search-tweets` lets you search for tweets within a specific community.

***

### ✅ Verification

Check whether specific social actions have occurred. This is essential for gated access flows, airdrop eligibility checks, and campaign validation.

`POST /check-follow` verifies whether one user follows another. `GET /check-comment` checks if a user has commented on a specific tweet. `POST /check-retweet` and `POST /check-quoted` verify retweet and quote tweet actions. `POST /check-community-member` checks whether a user belongs to a given community.

***

### 📈 Sorsa Info (Crypto & Web3)

Analyze account influence and audience quality using Sorsa's proprietary scoring system. These endpoints are especially relevant for Web3 projects, token communities, KOL (Key Opinion Leader) evaluation, and crypto influencer analytics.

`GET /score` returns the Sorsa Score for an account - a metric reflecting its influence and audience quality. `GET /followers-stats` breaks down followers by category. `GET /score-changes` tracks how the score has shifted over the past week and month.

`GET /top-followers` and `GET /top-following` return the top 20 followers and followings ranked by Sorsa Score. `GET /new-followers-7d` and `GET /new-following-7d` show recent audience changes over the past seven days.

***

### ⚙️ Technical utilities

Resolve identifiers and monitor your API usage.

`GET /username-to-id/{user_handle}` converts a username to a numeric user ID. `GET /id-to-username/{user_id}` does the reverse. `GET /link-to-id` extracts a user ID from a profile URL. You can also convert IDs manually using the free [ID Converter](https://api.sorsa.io/playground/id-converter) tool.

`GET /key-usage-info` returns your current API key usage statistics, including remaining quota and request history.

***

## Typical use cases

**Brand monitoring and social listening.** Use `/search-tweets` and `/mentions` to track keywords, hashtags, and brand mentions across X in real time. Combine with `/tweet-info` to pull engagement metrics for individual posts. Sorsa replaces the need for custom Twitter scraping scripts that break every time the platform changes.

**Data pipelines and warehousing.** Export structured tweet and user data into BigQuery, PostgreSQL, Snowflake, S3, or any downstream system. Batch endpoints like `/tweet-info-bulk` and `/info-batch` reduce the number of API calls needed for large-scale data ingestion and ETL workflows.

**Audience and influencer analysis.** Map follower graphs with `/followers` and `/follows`, identify high-value connections with `/top-followers`, and track audience growth over time with `/new-followers-7d` and `/score-changes`. Useful for influencer marketing platforms, competitor benchmarking, and social media analytics dashboards.

**Access gating and social verification.** Verify that users have completed required social actions before granting access to token drops, gated content, or campaign rewards. The `/check-follow`, `/check-retweet`, `/check-comment`, and `/check-community-member` endpoints handle this without requiring users to connect their X account via OAuth.

**AI training and NLP datasets.** Collect high-quality public conversational data for LLM fine-tuning, sentiment analysis, topic classification, or academic research. Use `/search-tweets` with advanced filters to build targeted datasets without maintaining your own X scraper infrastructure.

**No-code and low-code automation.** Connect Sorsa API to tools like Make (Integromat), Zapier, n8n, or Pipedream via HTTP request modules. Monitor accounts, trigger workflows on new mentions, or sync X data to spreadsheets and CRMs without writing code. You can also explore the API interactively using the [API Playground](https://api.sorsa.io/playground) - no coding needed.

For detailed implementation patterns and workflow examples, see the [Use Cases Guide](https://docs.sorsa.io/use-cases-overview).

***

## What Sorsa API does not support

Sorsa is a read-only API focused on data extraction and analysis. It does not perform write operations on the X platform:

* Posting tweets, replies, or direct messages
* Liking, bookmarking, or retweeting
* Following or unfollowing accounts
* Any action performed on behalf of a user account

If your use case requires write access, you can use the official X API for those operations alongside Sorsa for reliable read access at scale.

***

## Next steps

* [Quickstart](https://docs.sorsa.io/quickstart) - Get your API key and make your first request
* [Authentication](https://docs.sorsa.io/authentication) - Learn how to authorize requests to the v3 API
* [API Reference](https://docs.sorsa.io/api-reference) - Browse all 38 endpoints with parameters and response schemas
* [Pricing](https://docs.sorsa.io/pricing) - Understand available plans and request packages
* [Rate Limits](https://docs.sorsa.io/rate-limits) - Learn about usage quotas and throttling
* [Use Cases Guide](https://docs.sorsa.io/use-cases-overview) - Real-world implementation patterns and workflows
