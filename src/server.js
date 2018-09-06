#!/usr/bin/env node

var terminals = {}, logs = {};

const PORT = require('./config').PORT;
const express = require('express');
const app = express();
const pty = require('node-pty');
const argv = require('yargs').argv;

const port = argv.port || PORT;
const host = '0.0.0.0';
const ALLOWED_ORIGINS = [
  'localhost',
  '0.0.0.0',
  '127.0.0.1',
  'home.localhost',
  'chrome-extension://'
];

app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With');

  let origin = req.get('origin');
  let host = req.get('host');
  let foundOrigin = ALLOWED_ORIGINS.find(o => (origin && origin.indexOf(o) >= 0));
  let foundHost = ALLOWED_ORIGINS.find(h => (host && host.indexOf(h) >= 0));

  if (!foundOrigin && !foundHost) {
    res.status(403);
    res.send('Go away!');
    res.end();
    return;
  }
  next();
});
app.use('/', express.static(__dirname + '/../build'));

require('express-ws')(app);

app.post('/terminals', function (req, res) {
  let shell = argv.shell && argv.shell !== '' ? argv.shell : process.platform === 'win32' ? 'cmd.exe' : 'bash';
  let cols = parseInt(req.query.cols, 10);
  let rows = parseInt(req.query.rows, 10);
  let term = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: cols || 80,
    rows: rows || 24,
    cwd: process.env.PWD,
    env: process.env
  });

  console.log('Created terminal with PID: ' + term.pid);
  terminals[term.pid] = term;
  logs[term.pid] = '';
  term.on('data', function (data) {
    logs[term.pid] += data;
  });
  res.send(term.pid.toString());
  res.end();
});

app.post('/terminals/:pid/size', function (req, res) {
  let pid = parseInt(req.params.pid, 10);
  let cols = parseInt(req.query.cols, 10);
  let rows = parseInt(req.query.rows, 10);
  let term = terminals[pid];

  term.resize(cols, rows);
  console.log('Resized terminal ' + pid + ' to ' + cols + ' cols and ' + rows + ' rows.');
  res.end();
});

app.ws('/terminals/:pid', function (ws, req) {
  var term = terminals[parseInt(req.params.pid, 10)];

  if (!term) {
    ws.send('No such terminal created.');
    return;
  }

  console.log('Connected to terminal ' + term.pid);
  ws.send(logs[term.pid]);

  term.on('data', function (data) {
    // console.log('Incoming data = ' + data);
    try {
      ws.send(data);
    } catch (ex) {
      // The WebSocket is not open, ignore
    }
  });
  ws.on('message', function (msg) {
    term.write(msg);
  });
  ws.on('close', function () {
    term.kill();
    console.log('Closed terminal ' + term.pid);
    // Clean things up
    delete terminals[term.pid];
    delete logs[term.pid];
  });
});

if (!port) {
  console.error('Please provide a port: node ./src/server.js --port=XXXX');
  process.exit(1);
} else {
  app.listen(port, host);
  console.log('Evala server listening at http://' + host + ':' + port);
}
