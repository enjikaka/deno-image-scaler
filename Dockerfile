FROM hayd/deno:alpine-1.8.2

EXPOSE 5000
WORKDIR /app

RUN deno install --allow-read --allow-write --allow-env --allow-net --allow-run --no-check -r -f https://deno.land/x/deploy/deployctl.ts

ADD . /app
RUN deno cache index.ts

RUN deployctl run index.ts
