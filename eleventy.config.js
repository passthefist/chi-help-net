import format from "date-fns/format";
import htmlmin from "html-minifier";
import markdownIt from "markdown-it";
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import * as toc from "eleventy-plugin-toc-util";

const md = markdownIt();

export default async function (eleventyConfig) {
  eleventyConfig.setOutputDirectory('release');
  eleventyConfig.setInputDirectory('site');

  eleventyConfig.setDataDeepMerge(true);
  eleventyConfig.addPassthroughCopy({"site/assets":"assets"});
  eleventyConfig.addPassthroughCopy("admin");

  // -------------------------------------------------------------------------------------------------------------------------------------

  eleventyConfig.addPlugin(eleventyImageTransformPlugin);

  // -------------------------------------------------------------------------------------------------------------------------------------

  eleventyConfig.addFilter("slice", (array, number) => {
    return array.slice(0, number);
  });

  eleventyConfig.addFilter("unquote", (string) => {
    return string.slice(0, -1).substring(1);
  });

  eleventyConfig.addFilter("date", function (date, dateFormat) {
    return format(date, dateFormat);
  });

  eleventyConfig.addFilter("markdownify", function (content) {
    return md.render(String(content));
  });

  eleventyConfig.addFilter("assign", function (object, pair) {
    return Object.assign(object, pair);
  });

  eleventyConfig.addFilter("attachId", (html) => toc.attachId(html, "h2"));
  eleventyConfig.addFilter("attachAnchor", (html) => toc.attachIdAnchor(html, "h2", ""));
  eleventyConfig.addFilter("toc", (html) => toc.createToc(html, "h2"));

  // -------------------------------------------------------------------------------------------------------------------------------------

  eleventyConfig.addTransform("htmlmin", (content, outputPath) => {
    if (outputPath && outputPath.endsWith(".html")) {
      return htmlmin.minify(content, {
        collapseWhitespace: true,
        removeComments: true,
        useShortDoctype: true,
      });
    }

    return content;
  });
}

export const config = {
  markdownTemplateEngine: "njk",
};
