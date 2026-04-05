import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Chip,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Divider,
  Pagination
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import StorageIcon from '@mui/icons-material/Storage';
import TableChartIcon from '@mui/icons-material/TableChart';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { databaseApi } from '@/lib/api';
import { useWebSocket } from '@/lib/websocket';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`db-tabpanel-${index}`}
      aria-labelledby={`db-tab-${index}`}
      {...other}
      style={{ width: '100%' }}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `db-tab-${index}`,
    'aria-controls': `db-tabpanel-${index}`,
  };
}

// Define table structure types
interface TableStructure {
  name: string;
  columns: ColumnStructure[];
  rowCount: number;
}

interface ColumnStructure {
  name: string;
  type: string;
  isPrimary: boolean;
  isForeign: boolean;
  references?: string;
}

interface TableData {
  tableName: string;
  columns: string[];
  rows: any[];
  pagination: {
    limit: number;
    offset: number;
    totalRows: number;
  };
}

const DatabaseVisualizer: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tables, setTables] = useState<TableStructure[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const { isConnected } = useWebSocket();

  // Fetch database structure
  useEffect(() => {
    const fetchDatabaseStructure = async () => {
      try {
        setLoading(true);
        // Fetch real database schema from the API
        const response = await databaseApi.getDatabaseSchema();
        
        if (response.error) {
          setError(response.message || 'Failed to fetch database schema');
        } else {
          setTables(response.tables || []);
          setError(null);
        }
      } catch (err) {
        setError('Failed to fetch database structure');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDatabaseStructure();
  }, []);

  // Fetch table data when a table is selected
  useEffect(() => {
    if (!selectedTable) {
      setTableData(null);
      return;
    }

    const fetchTableData = async () => {
      try {
        setLoading(true);
        // Calculate offset based on pagination
        const offset = (page - 1) * rowsPerPage;
        
        // Fetch real table data from the API
        const response = await databaseApi.getTableData(selectedTable, rowsPerPage, offset);
        
        if (response.error) {
          setError(response.message || `Failed to fetch data for table ${selectedTable}`);
        } else {
          setTableData(response);
          setError(null);
        }
      } catch (err) {
        setError(`Failed to fetch data for table ${selectedTable}`);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTableData();
  }, [selectedTable, page, rowsPerPage]);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Handle table selection
  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
    setPage(1); // Reset to first page when changing tables
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    // Re-fetch data for the selected table
    if (selectedTable) {
      try {
        // Reset to first page when refreshing
        setPage(1);
        
        // Fetch table data again
        const response = await databaseApi.getTableData(selectedTable, rowsPerPage, 0);
        
        if (response.error) {
          setError(response.message || `Failed to refresh data for table ${selectedTable}`);
        } else {
          setTableData(response);
          setError(null);
        }
      } catch (err) {
        setError(`Failed to refresh data for table ${selectedTable}`);
        console.error(err);
      } finally {
        setRefreshing(false);
      }
    } else {
      setRefreshing(false);
    }
  };

  // Handle page change
  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  // Filter tables based on search query
  const filteredTables = tables.filter(table => 
    table.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card sx={{ width: '100%', overflow: 'hidden', boxShadow: 3 }}>
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="database tabs"
            variant="fullWidth"
            sx={{ 
              '& .MuiTab-root': { 
                fontWeight: 'bold',
                fontSize: '0.9rem',
                textTransform: 'none',
              }
            }}
          >
            <Tab 
              icon={<TableChartIcon />} 
              iconPosition="start" 
              label="Schema" 
              {...a11yProps(0)} 
            />
            <Tab 
              icon={<StorageIcon />} 
              iconPosition="start" 
              label="Data Explorer" 
              {...a11yProps(1)} 
            />
          </Tabs>
        </Box>

        {/* Schema Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6" component="h2" gutterBottom>
              Database Schema
            </Typography>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Typography color="error">{error}</Typography>
            ) : (
              <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
                <Table stickyHeader aria-label="database schema table">
                  <TableHead>
                    <TableRow>
                      <TableCell>Table Name</TableCell>
                      <TableCell>Columns</TableCell>
                      <TableCell>Primary Key</TableCell>
                      <TableCell>Foreign Keys</TableCell>
                      <TableCell>Row Count</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tables.map((table) => (
                      <TableRow 
                        key={table.name} 
                        hover 
                        onClick={() => handleTableSelect(table.name)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell component="th" scope="row">
                          <Typography variant="body2" fontWeight="bold">
                            {table.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {table.columns.length}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {table.columns.filter(col => col.isPrimary).map(col => (
                            <Chip 
                              key={col.name} 
                              label={col.name} 
                              size="small" 
                              color="primary" 
                              sx={{ mr: 0.5 }} 
                            />
                          ))}
                        </TableCell>
                        <TableCell>
                          {table.columns.filter(col => col.isForeign).map(col => (
                            <Tooltip 
                              key={col.name} 
                              title={`References ${col.references}`} 
                              arrow
                            >
                              <Chip 
                                label={col.name} 
                                size="small" 
                                color="secondary" 
                                sx={{ mr: 0.5 }} 
                              />
                            </Tooltip>
                          ))}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {table.rowCount}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Table Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {selectedTable ? (
                <Box>
                  <Typography variant="body1" fontWeight="bold" gutterBottom>
                    {selectedTable}
                  </Typography>
                  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                    <Table size="small" aria-label="column structure">
                      <TableHead>
                        <TableRow>
                          <TableCell>Column Name</TableCell>
                          <TableCell>Data Type</TableCell>
                          <TableCell>Constraints</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {tables.find(t => t.name === selectedTable)?.columns.map((column) => (
                          <TableRow key={column.name}>
                            <TableCell>
                              <Typography variant="body2" fontWeight={column.isPrimary ? 'bold' : 'normal'}>
                                {column.name}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {column.type}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {column.isPrimary && (
                                <Chip 
                                  label="PRIMARY KEY" 
                                  size="small" 
                                  color="primary" 
                                  sx={{ mr: 0.5 }} 
                                />
                              )}
                              {column.isForeign && (
                                <Chip 
                                  label={`FOREIGN KEY → ${column.references}`} 
                                  size="small" 
                                  color="secondary" 
                                  sx={{ mr: 0.5 }} 
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Select a table to view its structure
                </Typography>
              )}
            </Box>
          </Box>
        </TabPanel>

        {/* Data Explorer Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" component="h2">
                Data Explorer
              </Typography>
              <Box>
                <Button 
                  startIcon={<RefreshIcon />} 
                  onClick={handleRefresh}
                  disabled={refreshing || !selectedTable}
                  size="small"
                  sx={{ mr: 1 }}
                >
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              {/* Table List */}
              <Box sx={{ width: '30%', borderRight: 1, borderColor: 'divider', pr: 2 }}>
                <TextField
                  placeholder="Search tables..."
                  size="small"
                  fullWidth
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
                
                <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {filteredTables.map((table) => (
                    <Box 
                      key={table.name}
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                        mb: 1,
                        cursor: 'pointer',
                        bgcolor: selectedTable === table.name ? 'primary.light' : 'background.paper',
                        color: selectedTable === table.name ? 'primary.contrastText' : 'text.primary',
                        '&:hover': {
                          bgcolor: selectedTable === table.name ? 'primary.light' : 'action.hover',
                        },
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                      onClick={() => handleTableSelect(table.name)}
                    >
                      <Box>
                        <Typography variant="body1" fontWeight="medium">
                          {table.name}
                        </Typography>
                        <Typography variant="caption" color={selectedTable === table.name ? 'inherit' : 'text.secondary'}>
                          {table.rowCount} rows
                        </Typography>
                      </Box>
                      <IconButton 
                        size="small" 
                        color={selectedTable === table.name ? 'inherit' : 'primary'}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTableSelect(table.name);
                        }}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              </Box>

              {/* Table Data */}
              <Box sx={{ width: '70%' }}>
                {selectedTable ? (
                  loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <CircularProgress />
                    </Box>
                  ) : error ? (
                    <Typography color="error">{error}</Typography>
                  ) : tableData ? (
                    <>
                      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500 }}>
                        <Table stickyHeader size="small" aria-label="table data">
                          <TableHead>
                            <TableRow>
                              {tableData.columns.map((column) => (
                                <TableCell key={column}>
                                  <Typography variant="body2" fontWeight="bold">
                                    {column}
                                  </Typography>
                                </TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {tableData.rows.map((row, index) => (
                              <TableRow key={index} hover>
                                {tableData.columns.map((column) => (
                                  <TableCell key={column}>
                                    <Typography variant="body2">
                                      {row[column] !== undefined ? String(row[column]) : ''}
                                    </Typography>
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      
                      {/* Pagination */}
                      {tableData.pagination && tableData.pagination.totalRows > 0 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                          <Pagination 
                            count={Math.ceil(tableData.pagination.totalRows / tableData.pagination.limit)} 
                            page={page}
                            onChange={handlePageChange}
                            color="primary"
                          />
                        </Box>
                      )}
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No data available for this table
                    </Typography>
                  )
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                    <Typography variant="body1" color="text.secondary">
                      Select a table to view its data
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </TabPanel>
      </CardContent>
    </Card>
  );
};

export default DatabaseVisualizer;
