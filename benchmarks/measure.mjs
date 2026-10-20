// Timed batches measure CPU draw submission. A readback outside timing flushes each batch.
export async function measure(
  createRenderer,
  canvasFactory,
  { quick = false, only } = {},
) {
  const results = [];
  for (const mode of ["circular", "morphing"])
    for (const scale of [0.4, 1, 2])
      for (const count of [1, 3, 7]) {
        if (only && (mode !== "morphing" || scale !== 1 || count !== 7))
          continue;
        const canvas = canvasFactory(1800, 1400);
        const ctx = canvas.getContext("2d");
        const renderer = createRenderer(ctx);
        let frame = 0;
        function draw() {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, 1800, 1400);
          ctx.setTransform(2 * scale, 0, 0, 2 * scale, 0, 0);
          // Fresh objects and moving centers exercise common game/render-loop usage.
          const fields = Array.from({ length: count }, (_, i) => ({
            center: {
              x: (150 + (i % 3) * 300) / scale + Math.sin(frame / 60),
              y: (150 + Math.floor(i / 3) * 200) / scale,
            },
            radius: 200,
            innerRadius: 60,
            mode,
            morphAmount: 0.65,
          }));
          renderer.draw(fields, frame++ / 60, { scale });
        }
        const coldStart = performance.now();
        draw();
        const coldMs = performance.now() - coldStart;
        for (let i = 0; i < 40; i++) draw();
        ctx.getImageData(0, 0, 1, 1);
        const samples = [];
        for (let batch = 0; batch < (quick ? 3 : 9); batch++) {
          const start = performance.now();
          for (let i = 0; i < 10; i++) draw();
          samples.push((performance.now() - start) / 10);
          ctx.getImageData(0, 0, 1, 1);
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
        samples.sort((a, b) => a - b);
        results.push({
          mode,
          scale,
          fields: count,
          dpr: 2,
          coldMs,
          medianMs: samples[Math.floor(samples.length / 2)],
          p95Ms: samples[Math.ceil(samples.length * 0.95) - 1],
        });
        renderer.destroy();
        canvas.width = canvas.height = 1;
      }
  return results;
}
