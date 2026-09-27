# SAGE project page

Static project page for *Self-Adapting Group of Experts for Multi-Agent Reasoning*,
built on the [Academic Project Page Template](https://github.com/eliahuhorwitz/Academic-project-page-template).
It follows the layout of the [prefix-consistency page](https://naoto-iwase.github.io/prefix-consistency-page/):
a header, the abstract, three short sections (an italic lede, a one-line claim and one visual), and BibTeX.
The first section is an animated walkthrough of the method.

## Preview locally

```bash
cd project_page
python3 -m http.server 8000
# open http://localhost:8000
```

## Publish on GitHub Pages

The whole `project_page/` folder is the site root. Push its contents to a public repository, or to a
`gh-pages` branch, and enable Pages. `.nojekyll` turns off Jekyll processing.

## Placeholders to fill in

Search `index.html` for `TODO`.

| What | Where |
| --- | --- |
| arXiv and Code links | header buttons: replace `ARXIV_ID` and `USER/REPO` |
| "News" line (for example, the venue once accepted) | header: uncomment the block |
| Site URL | `og:url`, `og:image`, `twitter:image`, `citation_pdf_url` (`YOUR_DOMAIN`) |

`static/pdfs/sage_paper.pdf` is a copy of `SAGE_ICLR_2027/iclr2027_conference.pdf` as of 2026-09-26.
Copy it again after you update the paper, or replace the Paper button with arXiv.

## Files

- `index.html`: all content. The results table and the rewrite example are copied from the paper
  (Table 1 and the appendix case study).
- `static/css/index.css`: the template stylesheet, with the same spacing tweaks as the
  prefix-consistency page (`section-lede`, `acceptance-news`, tighter sections).
- `static/js/sage-method.js`: the method animation. It walks through the four stages on the toy
  example from the overview figure (agents A–D, answers 42 / 36 / 42 / 24). Its scores, parents and
  votes follow the paper's rules; the data and captions are in `STEPS` at the top of the file. It plays
  once when scrolled into view. The stage buttons jump to a stage, and Replay restarts. With
  reduced motion it does not autoplay, and the buttons show each stage's end state. The static
  overview figure is shown if the script cannot run.
- `static/css/sage.css`: the animation, the prompt comparison and the results table.
- `static/images/`: the overview figure (`sage_method_overview.svg`), the favicon and a 1200×630
  `social_preview.png`.
