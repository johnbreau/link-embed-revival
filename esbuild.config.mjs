import esbuild from "esbuild";
import process from "process";

const watch = process.argv.includes("--watch");

const ctx = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  platform: "browser",
  target: "es2020",
  format: "cjs",
  sourcemap: watch,
  outfile: "main.js",
  external: ["obsidian"]
});

if (watch) {
  await ctx.watch();
  console.log("Watching...");
} else {
  await ctx.rebuild();
  await ctx.dispose();
  console.log("Built.");
}