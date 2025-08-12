import { useEffect, useState } from 'react';
import { getDriverTreeSummary } from '../../../services/api';
import type { DriverTreeApiResponse } from '../../../types/dashboard.type';

export interface DriverTreeNode {
  id: string;
  label: string;
  value: number;
  numOfAcc: number;
  level: number;
  children?: DriverTreeNode[];
}

function generateNodeId(path: string[]) {
  return path.join('-');
}

function parseTree(
  node: any,
  path: string[] = [],
): DriverTreeNode {
  const id = generateNodeId([...path, node.name]);
  return {
    id,
    label: node.name,
    value: node.value,
    numOfAcc: node.numOfAcc,
    level: node.level,
    children: node.children?.map((child: any) =>
      parseTree(child, [...path, node.name])
    ),
  };
}

export function useFetchDriverTree(parquetFileName: string | null) {
  const [data, setData] = useState<DriverTreeNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!parquetFileName) return;
    setLoading(true);
    setError(null);
    getDriverTreeSummary(parquetFileName)
      .then((res: DriverTreeApiResponse) => {
        if (res.data?.root) {
          setData(parseTree(res.data.root));
        } else {
          setError('No root node found');
        }
      })
      .catch(() => setError('Failed to fetch driver tree'))
      .finally(() => setLoading(false));
  }, [parquetFileName]);

  return { data, loading, error };
}
