---
title: "I let my Watch Later hit 2,455 videos — then built a way out"
date: "2026-06-15"
slug: "taming-watch-later"
summary: "Pulling, categorizing, and culling a 2,455-video YouTube Watch Later — built in a couple of evenings with Claude Code, with a few genuinely interesting dead-ends."
tags: ["AI tooling", "automation", "side project"]
repo: "https://github.com/michitrung/watch-later-tamer"
---

Watch Later is where videos go to be forgotten. Mine had **2,455** of them — about 975 hours, roughly 40 days of continuous video I was never realistically going to watch. The list had quietly become write-only: I added to it constantly and never went back, because scrolling 2,455 items to find one worth watching is its own chore.

So, like any reasonable person with a backlog problem, I spent two evenings building a tool instead of watching any of the videos. I built it with [Claude Code](https://www.claude.com/product/claude-code), partly to see how far "describe the problem, review the work" could actually go. Here's what came out — and the few places it got interesting.

## First problem: you can't get the list out

YouTube's official API can't read Watch Later. It's a system playlist, and that access was removed years ago — so even *seeing* what's in there programmatically is the first hurdle.

The workaround is the one `yt-dlp` uses: read the browser's logged-in cookies and pull the playlist metadata that way. One pass, no per-video hammering, and I had all 2,455 as structured data — title, channel, duration, views. That alone was clarifying: 1,246 unique channels, most videos in the 5–20 minute range, a long tail reaching back to 2009.

## Making 2,455 videos browsable

A flat list of 2,455 is still unusable, so the tool categorizes every video into a dozen topics — Science, Tech, Finance, and so on — with an LLM reading the title and channel, fanned out across workers so it takes a minute rather than an afternoon. Then it bakes everything into a single self-contained HTML file: filter by topic, by year, by length; sort by a rough "watch rank"; search. No server, no build step — you open the file.

## The interesting part: deleting things

Watching is only half of it. The point was to *cull*, and removing things from Watch Later turned out to be a small rabbit hole:

- The official API can't modify Watch Later **at all**. So removal uses the same internal calls YouTube's own web app makes — locally, for my own account.
- My first attempt clicked the page's "Remove" menu via the DOM. It removed 7 of 25 marked videos and reported success. YouTube *virtualizes* the long list — only ~100 rows exist in the page at any moment — so most of what I'd marked was never on the page to click. Removing by video ID instead (no rendering required) fixed it.
- 67 videos were `[Deleted video]` / `[Private video]` phantoms: counted in the total, but hidden from the page with no way to even see them. The same by-ID removal cleared them.

The last piece was watching *without leaving*: each card embeds a player, and a Remove button beside it deletes the video the moment I've decided against it — with an Undo, because instant-delete without undo is a trap. The browser can't make those authenticated calls itself, so a tiny local helper does it.

## What the "AI part" actually was

The code isn't the interesting bit — a Python puller, an LLM classifier, a single-file front-end, a small local server. What Claude Code changed was the *ratio*: almost all of my time went to judgment and verification — is this the right way to remove, will it scale, did it actually do what it printed — and almost none to typing. Every dead-end above was found by running the thing and watching it fail, not by reading docs. I stayed the reviewer; the editor stayed fast.

## Where it landed

From 2,455 to a list I can actually navigate: filter to "Finance, 2025, under 20 minutes," watch one inline, delete it, move on. The phantoms are gone. Every video carries its upload date, so stale news is easy to tell from evergreen.

It's a personal tool: it reads my *own* YouTube login locally to act on my behalf, and parts of it lean on YouTube's internals — which can change or break — so the public version is honestly *works-on-my-machine, at your own risk*. But the broader point is one I keep relearning: the cost of building a small, exactly-right tool for your own annoyance has dropped far enough that it's often cheaper than tolerating the annoyance.

The code is on GitHub. If it saved you an afternoon, there's a coffee link below.
