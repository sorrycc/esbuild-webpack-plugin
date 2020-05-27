import React from 'react';
import { Button } from 'antd';
import {Chart, Axis, Tooltip, Line, Point} from "bizcharts";
import styles from './index.less';

export default () => {
  const data = [];
  // debugger;
  return (
    <div>
      <Button type="primary">Foo</Button>
      <Chart height={400} data={data} forceFit>
        <Axis name="temperature" label={{formatter: val => `${val}°C`}} />
        <Line position="month*temperature" size={2} color={'city'} />
        <Point position="month*temperature" size={4} color={'city'} />
      </Chart>
      <h1 className={styles.title}>Page index</h1>
    </div>
  );
}
