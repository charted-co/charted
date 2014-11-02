# Charted
Charted is a tool for automatically visualizing data, created by the
Product Science team at [Medium](https://medium.com/). Provide the
URL to a data file and Charted returns a beautiful, interactive,
and shareable chart of the data. Charted is deliberately sparse in
formatting and data transformation options, but it does offer a few
basic features:
* Rendering well on all screen sizes, including monitors
* Re-fetching the data and updating the chart every 30 minutes
* Moving data series into separate charts
* Adjusting the chart type, labels/titles, and background

## Data structure
Charted treats the first column of the data file as the labels for the
x-axis and all subsequent columns as y-series values. Charted does not
parse the first column (x-axis), but instead always equally spaces the
data points along the x-axis.

## Supported files
Charted currently supports csv files (including links to csv files on
Dropbox) and Google Spreadsheets. The settings for Dropbox links and
Google Spreadsheets must both be set to publically shareable.

## Running Charted
To try Charted out, simply download the repo and run `npm install`
to install dependencies. After that you will be able to run
`npm start`. This will start a server at localhost:3000.
