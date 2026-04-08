import { useState } from 'react';
import { Table, Select, Button, Tag, message } from 'antd';
import { CopyOutlined, DownloadOutlined } from '@ant-design/icons';
import type { ScreenRegistry } from './index';

interface Props {
  screens: ScreenRegistry[];
}

export function DeveloperView({ screens }: Props) {
  const [filterScreen, setFilterScreen] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  const allFields = screens.flatMap(s =>
    s.fields.map(f => ({ ...f, screenName: s.screen }))
  );

  const filtered = allFields.filter(f => {
    if (filterScreen !== 'All' && f.screenName !== filterScreen) return false;
    if (filterStatus !== 'All' && f.status !== filterStatus) return false;
    return true;
  });

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    message.success('Copied!');
  }

  function exportScreen(s: ScreenRegistry) {
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${s.screen.toLowerCase().replace(/ /g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns = [
    { title: 'Screen', dataIndex: 'screenName', key: 'screen', width: 120 },
    { title: 'Field Label', dataIndex: 'label', key: 'label', width: 160 },
    {
      title: 'SQL Query',
      dataIndex: 'sqlQuery',
      key: 'sqlQuery',
      render: (sql: string) => sql ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          <pre style={{ margin: 0, fontSize: 11, whiteSpace: 'pre-wrap', flex: 1 }}>{sql}</pre>
          <Button size="small" icon={<CopyOutlined />} onClick={() => copyToClipboard(sql)} />
        </div>
      ) : <span style={{ color: '#8896AA' }}>—</span>,
    },
    { title: 'API Endpoint', dataIndex: 'apiEndpoint', key: 'apiEndpoint', width: 200 },
    { title: 'Response Property', dataIndex: 'responseProperty', key: 'responseProperty', width: 140 },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'confirmed' ? 'green' : status === 'flagged' ? 'gold' : 'default'}>{status}</Tag>
      ),
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      width: 180,
      render: (notes: string) => notes ? <span style={{ color: '#856404', fontSize: 12 }}>{notes}</span> : null,
    },
  ];

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <Select
          value={filterScreen}
          onChange={setFilterScreen}
          style={{ width: 160 }}
          options={[{ value: 'All', label: 'All Screens' }, ...screens.map(s => ({ value: s.screen, label: s.screen }))]}
        />
        <Select
          value={filterStatus}
          onChange={setFilterStatus}
          style={{ width: 140 }}
          options={[
            { value: 'All', label: 'All Statuses' },
            { value: 'confirmed', label: 'Confirmed' },
            { value: 'flagged', label: 'Flagged' },
            { value: 'unverified', label: 'Unverified' },
          ]}
        />
        <span style={{ fontSize: 12, color: '#8896AA' }}>{filtered.length} fields</span>
      </div>

      {/* Export buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {screens.map(s => (
          <Button key={s.screen} size="small" icon={<DownloadOutlined />} onClick={() => exportScreen(s)}>
            {s.screen}
          </Button>
        ))}
      </div>

      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 20 }}
        rowClassName={record => record.status === 'flagged' ? 'flagged-row' : ''}
      />

      <style>{`.flagged-row td { background: #FFFBEB !important; }`}</style>
    </div>
  );
}
