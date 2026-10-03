'use strict';
'require view';
'require form';
'require fs';
'require ui';

return view.extend({
  load: function() {
    return L.resolveDefault(fs.exec('/usr/bin/cf-dns-speedtest', [ 'ui' ]), {
      stdout: 'status=idle\nbest_ip=-\nenabled=0\nlast_run=-\nscheduled=0\n'
    });
  },

  render: function(data) {
    var m, s, o;
    m = new form.Map('cf_dns_speedtest', _('Cloudflare DNS Speedtest'),
      _('After a speed test, only the configured domains are resolved by a dedicated mosdns instance returning the best IP; all other DNS queries keep using the existing resolver path.'));
    s = m.section(form.TypedSection, 'main', _('Settings'));
    s.anonymous = true;
    o = s.option(form.Flag, 'enabled', _('Enable'));
    o.rmempty = false;
    o = s.option(form.DynamicList, 'domains', _('Cloudflare domains'));
    o.datatype = 'hostname';
    o.placeholder = 'www.cloudflare.com';
    o = s.option(form.Value, 'listen_port', _('mosdns listen port'));
    o.datatype = 'port'; o.default = '5335';
    o = s.option(form.Value, 'schedule', _('Schedule'));
    o.placeholder = '0 5 * * *';
    o.description = _('Standard cron expression. Leave empty to disable scheduled tests. Click "Apply DNS configuration" after saving.');
    o = s.option(form.Value, 'threads', _('Test threads'));
    o.datatype = 'range(1,64)'; o.default = '4';
    o = s.option(form.Value, 'probes', _('Latency probes'));
    o.datatype = 'range(1,20)'; o.default = '4';
    o = s.option(form.Value, 'download_count', _('Download tests'));
    o.datatype = 'range(1,20)'; o.default = '5';
    o = s.option(form.Value, 'timeout', _('Per-test timeout (seconds)'));
    o.datatype = 'range(1,30)'; o.default = '5';
    o = s.option(form.Value, 'max_latency', _('Max latency (ms)'));
    o.datatype = 'range(1,9999)'; o.default = '300';
    o = s.option(form.Value, 'min_speed', _('Min speed (MB/s)'));
    o.datatype = 'ufloat'; o.default = '1';
    o = s.option(form.Value, 'test_url', _('Test URL'));
    o.datatype = 'string';

    s = m.section(form.NamedSection, 'runtime', 'runtime', _('Runtime status'));
    s.render = function() {
      var lines = String(data.stdout || '').trim().split('\n');
      var status = (lines.shift() || 'status=idle').replace(/^status=/, '');
      var ip = (lines.shift() || 'best_ip=-').replace(/^best_ip=/, '');
      var enabled = (lines.shift() || 'enabled=0').replace(/^enabled=/, '');
      var lastRun = (lines.shift() || 'last_run=-').replace(/^last_run=/, '');
      var scheduled = (lines.shift() || 'scheduled=0').replace(/^scheduled=/, '');
      var rows = lines.filter(function(line) { return line.length; }).map(function(line) { return line.split(','); });
      var statusText = { idle: _('Idle'), running: _('Running'), failed: _('Failed'), success: _('Succeeded'), stopped: _('Stopped') };
      var widths = [ '20%', '10%', '10%', '10%', '15%', '20%', '15%' ];
      var resultTable = rows.length ? E('div', { style: 'width:100%;overflow-x:auto;margin-top:1rem' }, [
        E('table', { style: 'display:table;width:100%;min-width:620px;table-layout:fixed;border-collapse:collapse' }, [
          E('thead', {}, E('tr', {}, rows[0].map(function(cell, index) {
            return E('th', { style: 'width:' + widths[index] + ';padding:.65rem .6rem;text-align:left;white-space:nowrap;border-bottom:1px solid var(--border-color-medium,#444)' }, cell);
          }))),
          E('tbody', {}, rows.slice(1).map(function(row) {
            return E('tr', {}, row.map(function(cell, index) {
              return E('td', { style: 'width:' + widths[index] + ';padding:.65rem .6rem;text-align:left;white-space:nowrap;border-bottom:1px solid var(--border-color-low,#222)' }, cell);
            }));
          }))
        ])
      ]) : E('p', { style: 'margin-top:1rem' }, _('No test results yet'));
      function card(label, value) {
        return E('div', { style: 'padding:.8rem;border:1px solid var(--border-color-medium,#333);border-radius:6px' }, [
          E('small', {}, label), E('div', { style: 'margin-top:.3rem;font-weight:600' }, value)
        ]);
      }
      return E('div', { class: 'cbi-section' }, [
        E('div', { style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.75rem;margin-bottom:1rem' }, [
          card(_('Status'), statusText[status] || status), card(_('Current best IP'), ip),
          card(_('DNS integration'), enabled === '1' ? _('Enabled') : _('Disabled')),
          card(_('Last test'), lastRun), card(_('Schedule'), scheduled !== '0' ? _('Active') : _('Inactive'))
        ]),
        E('div', { style: 'display:flex;flex-wrap:wrap;gap:.5rem;align-items:center' }, [
          E('button', { class: 'btn cbi-button-action', click: ui.createHandlerFn(this, function() {
            return fs.exec('/usr/bin/cf-dns-speedtest', [ 'start' ]).then(function() {
              ui.addNotification(null, E('p', _('Speed test started in the background.')));
              window.setTimeout(function() { location.reload(); }, 1500);
            });
          }) }, _('Run test now')),
          E('button', { class: 'btn cbi-button-negative', click: ui.createHandlerFn(this, function() {
            return fs.exec('/usr/bin/cf-dns-speedtest', [ 'stop' ]).then(function() { location.reload(); });
          }) }, _('Stop test')),
          E('button', { class: 'btn cbi-button-apply', click: ui.createHandlerFn(this, function() {
            return fs.exec('/usr/bin/cf-dns-speedtest', [ 'apply' ]).then(function() { location.reload(); });
          }) }, _('Apply DNS configuration')),
          E('button', { class: 'btn', click: function() { location.reload(); } }, _('Refresh status'))
        ]),
        resultTable
      ]);
    };
    return m.render();
  }
});
