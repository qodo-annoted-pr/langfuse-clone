## Caching Strategy of Prompts

The caching strategy for prompts is implemented in the `PromptService` class and is utilized in the `createPrompt` function. Here is an overview of how the caching mechanism works:

### Cache Structure

The cache for prompts is managed using Redis. The cache key looks like the following: `prompt:<project-id>:<prompt-name>:<prompt-<version ?? label>` This means that for each prompt name we have multiple keys in Redis. Also, if a prompt has multiple labels, it will appear in the cache multiple times.

### Creation and updates of prompts

We never update prompts in the cache. Instead, we remove all cache entries for a prompt name of a project when a prompt is updated. This ensures that the cache is always up-to-date with the database.
For this, we first acquire a lock in Redis, invalidate the cache, execute the operation in Postgres, and then release the lock.

### Reading prompts

When reading prompts, we check whether a lock exists. If it does not, we proceed to read the prompt from the cache. Thereby, we reset the ttl of the cache entry to ensure it remains in the cache.
If the lock exists, or the entry is not in Redis, we read the prompt from Postgres and store it in the cache.

## Prompt Library Summary

The prompt list view fetches a lightweight version summary via the prompts tRPC router. The summary is intended for dashboard context only and shows the number of prompt names, versions, prompt types, latest version, and labeled versions for the current project.

The query accepts the current search string and an `includeArchived` flag so the table can keep the summary aligned with common prompt list filters without loading all prompt rows into the client.
