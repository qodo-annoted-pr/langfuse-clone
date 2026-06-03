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

## Prompt duplication

Prompt and folder duplication reuse the same immutable prompt creation path, but normalize target names before calling the server mutation. This keeps accidental leading, trailing, or duplicate slashes from creating visually separate prompt paths.

The duplicate prompt dialog suggests the next available `-copy` name and shows the normalized target name before submit. The duplicate folder dialog also previews how prompt names will be mapped into the target folder and checks the prompt entitlement limit against the number of prompts in the source folder.

When folder duplication rewrites prompt references, dependency tags pointing at prompts inside the duplicated folder are rewritten to the new target folder. References to prompts outside the copied folder are preserved.
