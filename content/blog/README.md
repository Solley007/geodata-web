# Writing blog posts

This is your authoring guide. Every post is a markdown file in `/content/blog/`.

## Creating a new post

1. Create a file at `content/blog/your-post-slug.md`
2. The filename (without `.md`) becomes the URL — `/blog/your-post-slug`
3. Use kebab-case, lowercase, no spaces or special characters

## Frontmatter (required)

Every post needs this block at the very top:

```yaml
---
title: "Your headline goes here"
excerpt: "A 1-2 sentence summary that appears on the index page and in social shares."
date: "2026-04-15"
author: "Your Name"
authorRole: "Sales Director"
category: "Development"
coverImage: "https://your-cdn.com/image.jpg"
featured: false
---
```

| Field | Required | Notes |
|---|---|---|
| `title` | Yes | The post headline. Quotes recommended if it contains a colon. |
| `excerpt` | Yes | 1-2 sentence summary. Shows on index cards + social share previews. |
| `date` | Yes | ISO format `YYYY-MM-DD`. Posts are sorted newest-first by this. |
| `author` | Yes | Display name |
| `authorRole` | No | E.g. "Sales Director", "Editorial". Optional. |
| `category` | Yes | One of: `Development`, `Investment`, `Mortgage`, `Lifestyle`, `Company` |
| `coverImage` | Yes | Full URL to cover image (16:9 ratio looks best, min 1600px wide) |
| `featured` | No | If `true`, this post appears as the hero on the index page. Only one post should be featured at a time. |

## Body — markdown

After the frontmatter, write in standard markdown.

### Headings

Use `##` for major sections (these get the table of contents and deep-link anchors).
Use `###` for subsections within major sections.

Don't use `#` — that's reserved for the title (which lives in frontmatter).

### Emphasis

- `**bold**` for emphasis
- `*italic*` — renders in Fraunces serif italic, very distinctive
- Use italics sparingly; they're high-impact

### Lists

- Bulleted lists use `-` (em-dashes will replace the bullets visually)
- Numbered lists use `1.`, `2.`, etc.

### Quotes

```
> This becomes a styled pull quote with a gold left border.
> Use these for impactful statements you want readers to slow down on.
```

### Tables

Standard markdown tables work and are styled editorially:

```
| Column | Column |
|---|---|
| Cell | Cell |
```

### Links

`[link text](https://example.com)` — internal links work the same: `[link text](/properties)`

### Images

```
![alt text](https://your-cdn.com/image.jpg)
```

### Code

Inline: `` `code` ``
Blocks:

````
```typescript
const example = "syntax highlighted automatically";
```
````

## Tips for editorial quality

- **Keep paragraphs short.** 2-4 sentences. Walls of text discourage reading.
- **Lead with the conclusion or hook.** Don't bury your most interesting sentence in paragraph 4.
- **Use H2s liberally.** They give scanners somewhere to land. Aim for one every 3-4 paragraphs.
- **Internal-link to relevant pages.** When you mention MREIF, link to `/mortgage`. When you mention a residence, link to `/properties/[slug]`. This is good for SEO and good for conversion.
- **End with a CTA paragraph.** Every post should give the reader a next step.

## Cover image sourcing

Until you have professional photography:

- **Unsplash** — free, high quality, attribution optional. https://unsplash.com
- **Pexels** — same, slightly different selection. https://pexels.com

When you commission your own photography, drop the files in `/public/blog/` and reference them as `/blog/your-image.jpg`.

## Publishing

```bash
git add content/blog/your-post-slug.md
git commit -m "blog: new post — your post title"
git push
```

Vercel (or whatever you deploy on) will rebuild and the post will appear within ~30 seconds.

## Locally previewing before pushing

```bash
npm run dev
```

Then visit `http://localhost:3000/blog/your-post-slug` to see your post rendered. Iterate until it reads well, then commit.
