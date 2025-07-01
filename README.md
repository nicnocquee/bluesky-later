# Bluesky Later

A web application to schedule posts on Bluesky. There are two versions of the app: **Browser Mode** and **Self Hosted Mode**.

## Features

- Schedule posts on Bluesky.
- View scheduled posts.
- Attach an image to the post.
- A link in the post will be displayed as a [social card](https://docs.bsky.app/docs/advanced-guides/posts#website-card-embeds).
- Generate alt text for the image using OpenAI's GPT-4o-mini model. You bring your own API key and system prompt. The key will be saved in your browser's local storage.

## Usage

**Requirement**: you need to create an app password in Bluesky.

The easiest way to use the app is by using the [Browser Mode](https://github.com/nicnocquee/bluesky-later?tab=readme-ov-file#browser-mode) by clicking the link [here](https://app.blueskylater.com).

You can also deploy the app to your own server and run it in self hosted mode.

Continue reading to learn about the different modes.

## Browser Mode

- Completely free. You can use it now here: [https://app.blueskylater.com](https://app.blueskylater.com)
- This is the default mode of the app.
- It uses the browser's IndexedDB to store the Bluesky credentials (handle and app password) and the scheduled posts.
- **The scheduled posts will be sent to Bluesky at the scheduled time as long as the browser tab is open and you have internet connection.**
- You can deploy this web app to your own GitHub Pages by simply forking this repository and add these [repository variables](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/store-information-in-variables):
  - `VITE_IMAGE_PROXY_URL`: `https://allorigins.magic.coolify.nico.fyi/raw?url=`.
  - `VITE_METADATA_FETCHER_URL`: `https://linkpreview.magic.coolify.nico.fyi/api/v1/preview?url=`.

You can set different values for these variables. Read [Website Card Embeds](#website-card-embeds) for more details.

## Self Hosted Mode

- You need a server to host the app.
- The scheduled posts will be sent to Bluesky at the scheduled time from the API server **so you don't need to keep the tab open like in the browser mode**.
- The scheduled posts and Bluesky credentials (the handle and the app password) are stored in a PostgreSQL database.
- You can deploy this mode using the [docker-compose-example.yml file](https://github.com/nicnocquee/bluesky-later/blob/main/docker-compose-example.yml) provided in the repository and set the environment variables accordingly.
- After installing it on your server, you will be prompted to set an admin credential (username and password) which will be used to secure access to the API end points. This means that the instance of Bluesky Later will only be accessible to you. This API credential is different from the Bluesky credentials.

### Environment Variables

- `POSTGRES_USER`: The username of the PostgreSQL database.
- `POSTGRES_PASSWORD`: The password of the PostgreSQL database.
- `POSTGRES_DB`: The name of the PostgreSQL database.
- `DATABASE_URL`: The URL of the PostgreSQL database which will be used by the API server. This should be in the format `postgresql://<username>:<password>@<host>:<port>/<database>`, where the `<username>`, `<password>`, and `<database>` values must be the same as the ones used in the `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` environment variables.
- `CRON_SECRET`: A secret key that is used to authenticate the cron endpoint.
- `VITE_METADATA_FETCHER_URL`: The URL of the metadata fetcher service.
- `VITE_IMAGE_PROXY_URL`: The URL of the image proxy service.
- `VITE_API_URL`: The URL of the API server.

The docker-compose-example.yml file sets default values for these environment variables. **You must change them especially the `POSTGRES_PASSWORD` and `CRON_SECRET` if you want to use the app in production.**

### Components

The app has the following components:

- API server (`api` folder): This is the server that handles the scheduled posts and credentials. It connects to the PostgreSQL database and sends the scheduled posts to Bluesky.
- Frontend (`src` folder): This is the frontend of the app where user can schedule posts and view the scheduled posts. It connects to the API server to fetch the scheduled posts and credentials.

### Docker

A docker image of Bluesky Later is available on Docker Hub: [nicnocquee/bluesky-later](https://hub.docker.com/r/nicnocquee/bluesky-later). You can create and run a container using the following command:

```bash
docker run --env-file .env  -d -p 80:80 -p 3000:3000 nicnocquee/bluesky-later
```

Make sure you have the `.env` file and set the environment variables accordingly.

You can also use the [docker-compose-example.yml file](https://github.com/nicnocquee/bluesky-later/blob/main/docker-compose-example.yml) provided in the repository to run the app in self hosted mode.

## Website Card Embeds

Bluesky unfortunately does not automatically generate a social card for the website when a user posts a link to a website via the API. The application needs to generate the social card manually. In this app, it uses the service specified in the `VITE_METADATA_FETCHER_URL` environment variable to fetch the metadata of the website. And for the image of the card, it uses the service specified in the `VITE_IMAGE_PROXY_URL` environment variable to fetch the image to work around the CORS issue. By default, the application uses

- [linkpreview.magic.coolify.nico.fyi](https://linkpreview.magic.coolify.nico.fyi) for the metadata fetcher. The source code of the service is available [here](https://github.com/nicnocquee/link-preview-api). You can host it yourself on your own server.
- [allorigins.magic.coolify.nico.fyi](https://allorigins.magic.coolify.nico.fyi) for the image proxy. The source code of the service is available [here](https://github.com/nicnocquee/allOrigins). You can host it yourself on your own server.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, Shadcn UI, TypeScript (`src` folder)
- Backend: Node.js, Express, TypeScript (`api` folder)
- Database: PostgreSQL
- External Services: Metadata fetcher, Image proxy, Open AI
- Docker

## Development

### Testing
The project includes comprehensive testing with Vitest and React Testing Library, covering utilities, UI components, custom hooks, and business logic. See the [Testing Guide](docs/testing.md) for detailed information on running tests, writing new tests, and testing patterns.

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

## License

MIT

## Author

[@nico.fyi](https://bsky.app/profile/nico.fyi)

## Links

- [How to deploy Bluesky Later on your own server using Coolify](https://nico.fyi/blog/how-to-deploy-blueskylater-using-coolify)
- [How to deploy Bluesky Later to DigitalOcean Droplet](https://nico.fyi/blog/how-to-deploy-blueskylater-to-digitalocean-droplet)
