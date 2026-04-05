import React from 'react';
import { TableView } from './TableView';
import { Database, Block } from '../../../types/workspace';

interface TableViewCompactProps {
    database: Database;
    pages: Block[];
}

const TableViewCompact: React.FC<TableViewCompactProps> = ({ database, pages }) => {
    // Use the first view or a default table view
    const view = database.views[0] || {
        id: 'default',
        type: 'table',
        name: 'Table',
        properties: []
    };

    return (
        <TableView
            database={database}
            pages={pages}
            view={view}
            onUpdate={() => console.log('Table updated')}
        />
    );
};

export default TableViewCompact;
