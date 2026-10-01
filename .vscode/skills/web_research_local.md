# web_research_local

## description

This skill performs multi-source web research using two local services:

* **degoog** for web search and source discovery
* **curl.md** for retrieving and parsing the actual content of discovered web pages

The skill accepts a user's research question, searches the web through degoog, selects up to five relevant and preferably independent sources, retrieves the actual page content through curl.md using **keyword-only queries**, and performs cross-source analysis before producing the final answer.

The goal is:

```text
degoog = discover relevant sources
curl.md = retrieve relevant page content
LLM = compare, verify and synthesize the information
```

Do not use degoog search snippets as the primary evidence when the corresponding page can be retrieved through curl.md.

---

## tools

* run_in_terminal

---

## usage

The skill is invoked with a single string argument: the user's question.

### Step 1 — Search with degoog

Perform the initial web search using:

```bash
curl "http://192.168.12.169:4444/api/search?q=<encoded-query>"
```

The query must be URL-encoded.

The response is JSON.

Parse the JSON structurally and extract the available search results, including:

* title
* URL
* snippet
* ranking/order
* other useful metadata

Do not treat the JSON as plain text.

---

### Step 2 — Select sources

Select up to **5 relevant sources** from the degoog results.

Prefer sources that:

* directly address the user's question;
* contain substantive information rather than short snippets;
* come from different domains when possible;
* include primary or authoritative sources when available;
* provide complementary information.

Avoid selecting several pages from the same domain when other relevant independent sources are available.

Do not blindly select the first five results.

The objective is to obtain a diverse and useful set of sources for cross-source analysis.

If fewer than five useful sources are available, use all relevant sources.

---

### Step 3 — Build curl.md keywords

For each selected source, generate a concise set of keywords based on the user's actual research question.

Use the `keywords` parameter only.

Do **not** use `objective`.

The keywords should represent the important concepts that must be extracted from the page.

For example, for:

```text
Which Linux kernels are compatible with the AMD BC250?
```

use:

```text
keywords=BC250 kernel compatibility
```

For:

```text
Why does ROCm fail to detect my GPU?
```

use:

```text
keywords=ROCm GPU detection driver
```

For:

```text
How does Kubernetes PVC storage work?
```

use:

```text
keywords=Kubernetes PVC persistent volume storage
```

Do not simply copy the entire user question into the keywords.

---

### Step 4 — Retrieve each page through curl.md

For each selected URL, convert the URL into the curl.md path.

Use:

```bash
curl "http://127.0.0.1:3000/<domain>/<path>/?keywords=<encoded-keywords>"
```

For example:

```bash
curl "http://127.0.0.1:3000/elektricm.github.io/amd-bc250-docs/?keywords=KERNEL"
```

The `keywords` parameter must be URL-encoded.

Retrieve the content for each selected source independently.

Keep the association between:

```text
source title
source URL
source domain
retrieved Markdown
```

throughout the analysis.

If one source fails, continue with the remaining sources.

Do not abort the entire research operation because one source cannot be retrieved.

---

## Step 5 — Analyze the retrieved content

Do not simply summarize the five pages independently.

Perform cross-source analysis.

Identify:

### Agreements

Facts or conclusions supported by multiple independent sources.

### Unique information

Useful information that appears only in one source.

### Contradictions

Sources that disagree about:

* facts;
* versions;
* dates;
* specifications;
* recommendations;
* compatibility;
* procedures.

Do not silently resolve contradictions.

### Gaps

Information required to answer the user's question that is missing from the retrieved sources.

### Source quality

Prefer primary and authoritative sources where possible.

Consider whether multiple sources are independently reporting information or merely repeating the same original claim.

---

## Step 6 — Optional additional search

If the five retrieved sources do not provide enough information to answer the question reliably, perform an additional degoog search with a refined query.

For example:

```text
initial search
    ↓
5 sources
    ↓
curl.md
    ↓
identify missing information
    ↓
refined degoog search
    ↓
additional sources
```

Only perform additional searches when they are useful.

Avoid unnecessary searches.

---

## Step 7 — Produce the answer

The final answer must be a synthesis of the retrieved information.

Do not simply concatenate the contents of the five sources.

The answer should:

1. directly answer the user's question;
2. distinguish facts supported by multiple sources;
3. mention relevant source-specific information;
4. identify contradictions when they materially affect the answer;
5. mention important uncertainty or missing information;
6. preserve source attribution where appropriate.

When useful, include a concise list of the sources consulted with:

* title
* URL
* short description of why the source was relevant

Do not expose internal implementation details of the skill unless the user asks about them.

---

## implementation notes

* Use `run_in_terminal` to execute all HTTP requests.
* Use `curl` for both degoog and curl.md.
* URL-encode all query parameters.
* Parse the degoog response as JSON.
* Parse the curl.md response as Markdown/text.
* Never assume that a degoog result's snippet represents the full page.
* Retrieve the actual page through curl.md before using it as substantive evidence.
* Keep source metadata associated with retrieved content.
* Use only `keywords` with curl.md.
* Never use `objective` in this version of the skill.
* Prefer diverse domains when selecting the five sources.
* Continue if individual sources fail.
* Do not invent URLs.
* Do not invent search results.
* Do not claim that a source supports a statement unless that information is present in the retrieved content.

---

## source model

Maintain the following conceptual model throughout execution:

```text
                    USER QUESTION
                         │
                         ▼
                      degoog
                         │
                         │ JSON
                         ▼
                 candidate sources
                         │
                         ▼
                select up to 5
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
       curl.md         curl.md        curl.md
       keywords       keywords       keywords
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                  retrieved content
                         │
                         ▼
               cross-source analysis
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
       agreement    contradictions    gaps
                         │
                         ▼
                     synthesis
                         │
                         ▼
                       answer
```

---

## important behavior

The agent must not interpret this skill as:

```text
search → take first result → summarize it
```

It must behave as:

```text
search → select multiple sources → retrieve actual content
→ compare sources → identify agreements/conflicts
→ synthesize an answer
```

The purpose of using five sources is specifically to reduce dependence on a single webpage and improve the reliability of the final answer.

---

## example

For:

```text
What are the current requirements for running the AMD BC250 on Linux?
```

the skill should:

1. Search degoog for the topic.
2. Parse the JSON response.
3. Select up to five relevant sources.
4. Generate relevant keywords such as:

```text
AMD BC250 Linux kernel Mesa RADV requirements
```

5. Retrieve each page through curl.md.
6. Compare the retrieved information.
7. Identify common requirements and disagreements.
8. Produce a synthesized answer.

The final answer should be based primarily on the content retrieved through curl.md, not on the search snippets returned by degoog.

