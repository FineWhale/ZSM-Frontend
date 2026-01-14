import React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'

type Product = {
  id: number
  title: string
  description: string
  price: number
  category: string
  brand: string
}

type ProductsResponse = {
  products: Product[]
  total: number
  skip: number
  limit: number
}

async function fetchProducts(): Promise<ProductsResponse> {
  const res = await fetch('https://dummyjson.com/products?limit=100')
  if (!res.ok) {
    throw new Error('Gagal mengambil data produk')
  }
  return res.json()
}

export const ProductsPage: React.FC = () => {
  const [globalFilter, setGlobalFilter] = React.useState('')
  const [categoryFilter, setCategoryFilter] = React.useState('all')
  const [brandFilter, setBrandFilter] = React.useState('all')
  const [minPrice, setMinPrice] = React.useState<string>('')
  const [maxPrice, setMaxPrice] = React.useState<string>('')
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 50,
  })

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<
    ProductsResponse,
    Error
  >({
    queryKey: ['products'],
    queryFn: fetchProducts,
  })

  const products = React.useMemo(() => {
    if (!data) return []
    let filtered = data.products

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(
        (p) => p.category && p.category.toLowerCase() === categoryFilter.toLowerCase(),
      )
    }

    if (brandFilter !== 'all') {
      filtered = filtered.filter(
        (p) => p.brand && p.brand.toLowerCase() === brandFilter.toLowerCase(),
      )
    }

    const min = minPrice ? Number(minPrice) : undefined
    const max = maxPrice ? Number(maxPrice) : undefined

    if (!Number.isNaN(min) && min !== undefined) {
      filtered = filtered.filter((p) => p.price >= min)
    }
    if (!Number.isNaN(max) && max !== undefined) {
      filtered = filtered.filter((p) => p.price <= max)
    }

    if (globalFilter.trim()) {
      const search = globalFilter.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          (p.title && p.title.toLowerCase().includes(search)) ||
          (p.brand && p.brand.toLowerCase().includes(search)) ||
          (p.category && p.category.toLowerCase().includes(search)),
      )
    }

    return filtered
  }, [data, globalFilter, categoryFilter, brandFilter, minPrice, maxPrice])

  const columns = React.useMemo<ColumnDef<Product>[]>(
    () => [
      {
        header: 'ID',
        accessorKey: 'id',
      },
      {
        header: 'Nama Produk',
        accessorKey: 'title',
      },
      {
        header: 'Brand',
        accessorKey: 'brand',
        cell: ({ getValue }) => getValue<string>() || '-',
      },
      {
        header: 'Kategori',
        accessorKey: 'category',
      },
      {
        header: 'Harga',
        accessorKey: 'price',
        cell: ({ getValue }) =>
          new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'USD',
          }).format(getValue<number>()),
      },
      {
        header: 'Deskripsi',
        accessorKey: 'description',
        cell: ({ getValue }) => {
          const text = getValue<string>()
          return text.length > 80 ? text.slice(0, 77) + '...' : text
        },
      },
    ],
    [],
  )

  const table = useReactTable({
    data: products,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
  })

  // Reset ke halaman pertama ketika ada perubahan filter
  React.useEffect(() => {
    setPagination({ pageIndex: 0, pageSize: 50 })
  }, [globalFilter, categoryFilter, brandFilter, minPrice, maxPrice])

  const categories = React.useMemo(() => {
    if (!data) return []
    const set = new Set<string>()
    data.products.forEach((p) => set.add(p.category))
    return Array.from(set).sort()
  }, [data])

  const brands = React.useMemo(() => {
    if (!data) return []
    const set = new Set<string>()
    data.products.forEach((p) => set.add(p.brand))
    return Array.from(set).sort()
  }, [data])

  return (
    <div className="page">
      <h1 className="title">Daftar Produk</h1>

      <ProductsToolbar
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        brandFilter={brandFilter}
        setBrandFilter={setBrandFilter}
        minPrice={minPrice}
        maxPrice={maxPrice}
        setMinPrice={setMinPrice}
        setMaxPrice={setMaxPrice}
        categories={categories}
        brands={brands}
        isFetching={isFetching}
        refetch={refetch}
      />

      {isLoading && (
        <div className="status status-loading">
          <div className="spinner" />
          <span>Sedang memuat data produk...</span>
        </div>
      )}

      {isError && (
        <div className="status status-error">
          <span>
            Terjadi kesalahan: {error?.message ?? 'Tidak diketahui'}
          </span>
          <button onClick={() => refetch()}>Coba lagi</button>
        </div>
      )}

      {!isLoading && !isError && (
        <ProductsTable
          table={table}
          columns={columns}
          totalCount={products.length}
        />
      )}
    </div>
  )
}

type ProductsToolbarProps = {
  globalFilter: string
  setGlobalFilter: (value: string) => void
  categoryFilter: string
  setCategoryFilter: (value: string) => void
  brandFilter: string
  setBrandFilter: (value: string) => void
  minPrice: string
  maxPrice: string
  setMinPrice: (value: string) => void
  setMaxPrice: (value: string) => void
  categories: string[]
  brands: string[]
  isFetching: boolean
  refetch: () => void
}

const ProductsToolbar: React.FC<ProductsToolbarProps> = ({
  globalFilter,
  setGlobalFilter,
  categoryFilter,
  setCategoryFilter,
  brandFilter,
  setBrandFilter,
  minPrice,
  maxPrice,
  setMinPrice,
  setMaxPrice,
  categories,
  brands,
  isFetching,
  refetch,
}) => {
  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <label>
          <span>Cari (nama/brand/kategori):</span>
          <input
            type="text"
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="contoh: phone, apple, laptop..."
          />
        </label>
      </div>

      <div className="toolbar-group">
        <label>
          <span>Filter Kategori:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">Semua</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="toolbar-group">
        <label>
          <span>Filter Brand:</span>
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
          >
            <option value="all">Semua</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="toolbar-group">
        <span>Rentang Harga (USD):</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
          <input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </div>
      </div>

      <div className="toolbar-group">
        <button onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? 'Menyegarkan...' : 'Refresh'}
        </button>
      </div>
    </div>
  )
}

type ProductsTableProps = {
  table: ReturnType<typeof useReactTable<Product>>
  columns: ColumnDef<Product>[]
  totalCount: number
}

const ProductsTable: React.FC<ProductsTableProps> = ({
  table,
  columns,
  totalCount,
}) => {
  return (
    <>
      <div className="table-wrapper">
        <table>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    {{
                      asc: ' ▲',
                      desc: ' ▼',
                    }[header.column.getIsSorted() as string] ?? null}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="empty">
                  Tidak ada data untuk ditampilkan.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {cell.column.columnDef.cell
                        ? flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )
                        : String(cell.getValue() ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <div className="pagination-info">
          Menampilkan{' '}
          <strong>
            {table.getState().pagination.pageIndex *
              table.getState().pagination.pageSize +
              1}
            {' - '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) *
                table.getState().pagination.pageSize,
              totalCount,
            )}
          </strong>{' '}
          dari <strong>{totalCount}</strong> produk
        </div>
        <div className="pagination-controls">
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            {'<<'}
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            {'<'}
          </button>
          <span>
            Halaman{' '}
            <strong>
              {table.getState().pagination.pageIndex + 1} dari{' '}
              {table.getPageCount() || 1}
            </strong>
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {'>'}
          </button>
          <button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            {'>>'}
          </button>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
          >
            {[5, 10, 20, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize} / halaman
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  )
}

