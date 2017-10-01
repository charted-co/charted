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
