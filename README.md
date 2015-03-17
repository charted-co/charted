# Charted
Charted is a tool for automatically visualizing data, originally created by
the Product Science team at [Medium](https://medium.com/). Provide the
link to a data file and Charted returns a beautiful, interactive,
and shareable chart of the data. The charts look like this:

![Example Chart Screenshot](img/example_chart_screenshot.png?raw=true "Example Chart Screenshot")

Charted is deliberately sparse in formatting and data transformation options,
and instead gives you a few powerful core features:
* Rendering well on all screen sizes, including monitors
* Re-fetching the data and updating the chart every 30 minutes
* Moving data series into separate charts
* Adjusting the chart type, labels/titles, and background

## Supported files
Charted currently supports the following file types:
* .csv files
* .tsv files
* Google Spreadsheets (set to shareable)
* Dropbox share links to supported files

## Data structure
Charted treats the first column of the data file as the labels for the
x-axis. All subsequent columns are added as y-series. Charted does not
parse the first column (x-axis), but instead always equally spaces the
data points along the x-axis.

## Running Charted
To try Charted out, simply download the repo and run `npm install`
to install dependencies. After that you will be able to run
`npm start`. This will start a server at localhost:3000.

### On Heroku

[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy?template=https://github.com/mikesall/charted)

### With Docker

You can also run Charted via _docker_ by running
`docker build -t charted .` in the repo to build the container. You
will then be able to run the container using
`docker run -p 3000:3000 charted`. Server will be accessible at
localhost:3000

## Using the Node module

Charted also comes as a Node module which can be included in an
Express or Matador application. This lets you direct the user to
Charted URLs within the app, which can fetch data from other routes.
(Note that Charted adds an endpoint which can make GET requests to
arbitrary URLs from your app.)

Call `charted(app)` to set up Charted in your app. By default, the
Charted home page and assets will be served from `/charted/`, which
you can customize the path by providing another path as a second
argument. For example, providing '/' will cause Charted to be served
from the root of your app.
