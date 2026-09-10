# Data Table
URL: /docs/components/radix/data-table



<ComponentTabs name="data-table-demo" align="start" className="p-4" />

## Installation [#installation]

<Steps>
  <Step>
    Install the main component and dependencies:

    <CodeBlockTabs defaultValue="npm" groupId="package-manager">
      <CodeBlockTabsList>
        <CodeBlockTabsTrigger value="npm">
          npm
        </CodeBlockTabsTrigger>

        <CodeBlockTabsTrigger value="pnpm">
          pnpm
        </CodeBlockTabsTrigger>

        <CodeBlockTabsTrigger value="yarn">
          yarn
        </CodeBlockTabsTrigger>

        <CodeBlockTabsTrigger value="bun">
          bun
        </CodeBlockTabsTrigger>
      </CodeBlockTabsList>

      <CodeBlockTab value="npm">
        ```bash
        npx shadcn@latest add "@diceui/data-table"
        ```
      </CodeBlockTab>

      <CodeBlockTab value="pnpm">
        ```bash
        pnpm dlx shadcn@latest add "@diceui/data-table"
        ```
      </CodeBlockTab>

      <CodeBlockTab value="yarn">
        ```bash
        yarn dlx shadcn@latest add "@diceui/data-table"
        ```
      </CodeBlockTab>

      <CodeBlockTab value="bun">
        ```bash
        bun x shadcn@latest add "@diceui/data-table"
        ```
      </CodeBlockTab>
    </CodeBlockTabs>

    Filter and sort list installs bundle a `sortable` component that uses the unified [`radix-ui`](https://www.radix-ui.com/primitives/docs/overview/getting-started) package. Individual `@radix-ui/react-*` packages (such as `@radix-ui/react-slot`) are no longer required.
  </Step>

  <Step>
    Wrap your application with the [`NuqsAdapter`](https://nuqs.47ng.com/docs/adapters) for query state management:

    ```tsx
    import { NuqsAdapter } from "nuqs/adapters/next/app";

    <NuqsAdapter>
      <App />
    </NuqsAdapter>
    ```
  </Step>

  <Step>
    Install the following optional components:

    [`DataTableSortList`](#datatablesortlist):

    <CodeBlockTabs defaultValue="npm" groupId="package-manager">
      <CodeBlockTabsList>
        <CodeBlockTabsTrigger value="npm">
          npm
        </CodeBlockTabsTrigger>

        <CodeBlockTabsTrigger value="pnpm">
          pnpm
        </CodeBlockTabsTrigger>

        <CodeBlockTabsTrigger value="yarn">
          yarn
        </CodeBlockTabsTrigger>

        <CodeBlockTabsTrigger value="bun">
          bun
        </CodeBlockTabsTrigger>
      </CodeBlockTabsList>

      <CodeBlockTab value="npm">
        ```bash
        npx shadcn@latest add "@diceui/data-table-sort-list"
        ```
      </CodeBlockTab>

      <CodeBlockTab value="pnpm">
        ```bash
        pnpm dlx shadcn@latest add "@diceui/data-table-sort-list"
        ```
      </CodeBlockTab>

      <CodeBlockTab value="yarn">
        ```bash
        yarn dlx shadcn@latest add "@diceui/data-table-sort-list"
        ```
      </CodeBlockTab>

      <CodeBlockTab value="bun">
        ```bash
        bun x shadcn@latest add "@diceui/data-table-sort-list"
        ```
      </CodeBlockTab>
    </CodeBlockTabs>

    [`DataTableFilterList`](#datatablefilterlist):

    <CodeBlockTabs defaultValue="npm" groupId="package-manager">
      <CodeBlockTabsList>
        <CodeBlockTabsTrigger value="npm">
          npm
        </CodeBlockTabsTrigger>

        <CodeBlockTabsTrigger value="pnpm">
          pnpm
        </CodeBlockTabsTrigger>

        <CodeBlockTabsTrigger value="yarn">
          yarn
        </CodeBlockTabsTrigger>

        <CodeBlockTabsTrigger value="bun">
          bun
        </CodeBlockTabsTrigger>
      </CodeBlockTabsList>

      <CodeBlockTab value="npm">
        ```bash
        npx shadcn@latest add "@diceui/data-table-filter-list"
        ```
      </CodeBlockTab>

      <CodeBlockTab value="pnpm">
        ```bash
        pnpm dlx shadcn@latest add "@diceui/data-table-filter-list"
        ```
      </CodeBlockTab>

      <CodeBlockTab value="yarn">
        ```bash
        yarn dlx shadcn@latest add "@diceui/data-table-filter-list"
        ```
      </CodeBlockTab>

      <CodeBlockTab value="bun">
        ```bash
        bun x shadcn@latest add "@diceui/data-table-filter-list"
        ```
      </CodeBlockTab>
    </CodeBlockTabs>

    [`DataTableFilterMenu`](#datatablefiltermenu):

    <CodeBlockTabs defaultValue="npm" groupId="package-manager">
      <CodeBlockTabsList>
        <CodeBlockTabsTrigger value="npm">
          npm
        </CodeBlockTabsTrigger>

        <CodeBlockTabsTrigger value="pnpm">
          pnpm
        </CodeBlockTabsTrigger>

        <CodeBlockTabsTrigger value="yarn">
          yarn
        </CodeBlockTabsTrigger>

        <CodeBlockTabsTrigger value="bun">
          bun
        </CodeBlockTabsTrigger>
      </CodeBlockTabsList>

      <CodeBlockTab value="npm">
        ```bash
        npx shadcn@latest add "@diceui/data-table-filter-menu"
        ```
      </CodeBlockTab>

      <CodeBlockTab value="pnpm">
        ```bash
        pnpm dlx shadcn@latest add "@diceui/data-table-filter-menu"
        ```
      </CodeBlockTab>

      <CodeBlockTab value="yarn">
        ```bash
        yarn dlx shadcn@latest add "@diceui/data-table-filter-menu"
        ```
      </CodeBlockTab>

      <CodeBlockTab value="bun">
        ```bash
        bun x shadcn@latest add "@diceui/data-table-filter-menu"
        ```
      </CodeBlockTab>
    </CodeBlockTabs>
  </Step>

  <Step>
    Update import paths for custom components:

    The shadcn CLI doesn't handle custom component paths properly ([see issue](https://github.com/shadcn-ui/ui/issues/8308)). You'll need to update these imports manually:

    **In `components/data-table/data-table.tsx`:**

    ```tsx title="components/data-table/data-table.tsx"
    import { getCommonPinningStyles } from "@/components/data-table/data-table"; // [!code --]
    import { getCommonPinningStyles } from "@/lib/data-table"; // [!code ++]
    ```

    **In `lib/data-table.ts`:**

    ```tsx title="lib/data-table.ts"
    import { dataTableConfig } from "@/components/data-table/data-table"; // [!code --]
    import type { // [!code --]
      ExtendedColumnFilter, // [!code --]
      FilterOperator, // [!code --]
      FilterVariant, // [!code --]
    } from "@/components/data-table/data-table"; // [!code --]
    import { dataTableConfig } from "@/config/data-table"; // [!code ++]
    import type { // [!code ++]
      ExtendedColumnFilter, // [!code ++]
      FilterOperator, // [!code ++]
      FilterVariant, // [!code ++]
    } from "@/types/data-table"; // [!code ++]
    ```

    **In `lib/parsers.ts`:**

    ```tsx title="lib/parsers.ts"
    import { dataTableConfig } from "@/components/data-table/data-table"; // [!code --]
    // [!code --]
    import type { // [!code --]
      ExtendedColumnFilter, // [!code --]
      ExtendedColumnSort, // [!code --]
    } from "@/components/data-table/data-table"; // [!code --]
    import { dataTableConfig } from "@/config/data-table"; // [!code ++]
    // [!code ++]
    import type { // [!code ++]
      ExtendedColumnFilter, // [!code ++]
      ExtendedColumnSort, // [!code ++]
    } from "@/types/data-table"; // [!code ++]
    ```

    Update imports to use `@/lib/data-table` for utility functions, `@/config/data-table` for config, and `@/types/data-table` for types instead of importing from `@/components/data-table/data-table`.
  </Step>
</Steps>

## Layout [#layout]

Import the components and compose them together:

```tsx
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableAdvancedToolbar } from "@/components/data-table/data-table-advanced-toolbar";
import { DataTableFilterList } from "@/components/data-table/data-table-filter-list";
import { DataTableSortList } from "@/components/data-table/data-table-sort-list";
import { useDataTable } from "@/hooks/use-data-table";

const { table } = useDataTable({
  data,
  columns,
  pageCount,
});

// With standard toolbar
<DataTable table={table}>
  <DataTableToolbar table={table}>
    <DataTableSortList table={table} />
  </DataTableToolbar>
</DataTable>

// With advanced toolbar
<DataTable table={table}>
  <DataTableAdvancedToolbar table={table}>
    <DataTableFilterList table={table} />
    <DataTableSortList table={table} />
  </DataTableAdvancedToolbar>
</DataTable>
```

## Walkthrough [#walkthrough]

<Steps>
  <Step>
    Define columns with appropriate metadata:

    ```tsx
    import { Text, CalendarIcon, DollarSign } from "lucide-react";
    import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";

    const columns = React.useMemo(() => [
      {
        // Provide an unique id for the column
        // This id will be used as query key for the column filter
        id: "title", // [!code highlight]
        accessorKey: "title",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Title" />
        ),
        cell: ({ row }) => <div>{row.getValue("title")}</div>,
        // Define the column meta options for sorting, filtering, and view options
        meta: { // [!code highlight]
          label: "Title", // [!code highlight]
          placeholder: "Search titles...", // [!code highlight]
          variant: "text", // [!code highlight]
          icon: Text, // [!code highlight]
        }, // [!code highlight] 
        // By default, the column will not be filtered. Set to `true` to enable filtering.
        enableColumnFilter: true, // [!code highlight]
      },
    ], []);
    ```
  </Step>

  <Step>
    Initialize the table state using the `useDataTable` hook:

    ```tsx
    import { useDataTable } from "@/hooks/use-data-table";

    function DataTableDemo() {
      const { table } = useDataTable({
        data,
        columns,
        // Pass the total number of pages for the table
        pageCount, // [!code highlight]
        initialState: {
          sorting: [{ id: "createdAt", desc: true }],
          pagination: { pageSize: 10 },
        },
        // Unique identifier for rows, can be used for unique row selection
        getRowId: (row) => row.id, // [!code highlight]
      });

      return (
        // ... render table
      );
    }
    ```
  </Step>

  <Step>
    Pass the table instance to the `DataTable`, and `DataTableToolbar` components:

    ```tsx
    import { DataTable } from "@/components/data-table/data-table";
    import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
    import { DataTableSortList } from "@/components/data-table/data-table-sort-list";

    function DataTableDemo() {
      return (
        <DataTable table={table}>
          <DataTableToolbar table={table}>
            <DataTableSortList table={table} />
          </DataTableToolbar>
        </DataTable>
      );
    }
    ```
  </Step>

  <Step>
    For advanced filtering, use the `DataTableAdvancedToolbar` component:

    ```tsx
    import { DataTableAdvancedToolbar } from "@/components/data-table/data-table-advanced-toolbar";
    import { DataTableFilterList } from "@/components/data-table/data-table-filter-list";
    import { DataTableFilterMenu } from "@/components/data-table/data-table-filter-menu";

    function DataTableDemo() {
      return (
        <DataTable table={table}>
          <DataTableAdvancedToolbar table={table}>
            <DataTableFilterList table={table} />
            <DataTableSortList table={table} />
          </DataTableAdvancedToolbar>
        </DataTable>
      );
    }
    ```
  </Step>

  <Step>
    Alternatively, swap out `DataTableFilterList` with `DataTableFilterMenu` for a command palette-style interface:

    ```tsx
    import { DataTableAdvancedToolbar } from "@/components/data-table/data-table-advanced-toolbar";
    import { DataTableFilterList } from "@/components/data-table/data-table-filter-list"; // [!code --]
    import { DataTableFilterMenu } from "@/components/data-table/data-table-filter-menu"; // [!code ++]
    import { DataTableSortList } from "@/components/data-table/data-table-sort-list";

    function DataTableDemo() {
      return (
        <DataTable table={table}>
          <DataTableAdvancedToolbar table={table}>
            {/* [!code --] */}
            <DataTableFilterList table={table} />
            {/* [!code ++] */}
            <DataTableFilterMenu table={table} />
            <DataTableSortList table={table} />
          </DataTableAdvancedToolbar>
        </DataTable>
      );
    }
    ```
  </Step>

  <Step>
    Render an action bar on row selection:

    ```tsx
    import { ActionBar } from "@/components/ui/action-bar";

    function TableActionBar({ table }: { table: Table<Data> }) {
      const rows = table.getFilteredSelectedRowModel().rows;

      const onOpenChange = React.useCallback((open: boolean) => {
        if (!open) {
          table.toggleAllRowsSelected(false);
        }
      },
      [table],
    );
      
      return (
        <ActionBar open={rows.length > 0} onOpenChange={onOpenChange}>
          {/* Add your custom actions here */}
        </ActionBar>
      );
    }

    function DataTableDemo() {
      return (
        <DataTable 
          table={table}
          actionBar={<TableActionBar table={table} />}
        >
          <DataTableToolbar table={table} />
        </DataTable>
      );
    }
    ```
  </Step>
</Steps>

## API Reference [#api-reference]

### Column Definitions [#column-definitions]

The column definitions are used to define the columns of the data table.

```tsx
const columns = React.useMemo<ColumnDef<Project>[]>(() => [
  {
    // Required: Unique identifier for the column
    id: "title", // [!code highlight]
    // Required: Key to access the data, `accessorFn` can also be used
    accessorKey: "title", // [!code highlight]
    // Optional: Custom header component
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Title" />
    ),
    // Optional: Custom cell component
    cell: ({ row }) => <div>{row.getValue("title")}</div>,
    // Optional: Meta options for filtering, sorting, and view options
    meta: {
      label: "Title",
      placeholder: "Search titles...",
      variant: "text",
      icon: Text,
    },
    // By default, the column will not be filtered. Set to `true` to enable filtering.
    enableColumnFilter: true, // [!code highlight]
  },
  {
    id: "status",
    // Access nested data using `accessorFn`
    accessorFn: (row) => row.lineItem.status,
    header: "Status",
    meta: {
      label: "Status",
      variant: "select",
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
    },
    enableColumnFilter: true,
  },
], []);
```

#### Properties [#properties]

Core configuration options for defining columns.

<PropsTable
  data="[
  {
    title: &#x22;id&#x22;,
    description: &#x22;Required: Unique identifier for the column&#x22;,
  },
  {
    title: &#x22;accessorKey&#x22;,
    description: &#x22;Required: Key to access the data from the row&#x22;,
  },
  {
    title: &#x22;accessorFn&#x22;,
    description: &#x22;Optional: Custom accessor function to access data&#x22;,
  },
  {
    title: &#x22;header&#x22;,
    description: &#x22;Optional: Custom header component with column props&#x22;,
  },
  {
    title: &#x22;cell&#x22;,
    description: &#x22;Optional: Custom cell component with row props&#x22;,
  },
  {
    title: &#x22;meta&#x22;,
    description: &#x22;Optional: Meta options for accessing column metadata&#x22;,
  },
  {
    title: &#x22;enableColumnFilter&#x22;,
    description: &#x22;By default, the column will not be filtered. Set to `true` to enable filtering&#x22;,
  },
  {
    title: &#x22;enableSorting&#x22;,
    description: &#x22;Enable sorting for this column&#x22;,
  },
  {
    title: &#x22;enableHiding&#x22;,
    description: &#x22;Enable column visibility toggle&#x22;,
  },
]"
/>

#### Column Meta [#column-meta]

Column meta options for filtering, sorting, and view options.

<PropsTable
  data="[
  {
    title: &#x22;label&#x22;,
    description: &#x22;The display name for the column&#x22;,
  },
  {
    title: &#x22;placeholder&#x22;,
    description: &#x22;The placeholder text for filter inputs&#x22;,
  },
  {
    title: &#x22;variant&#x22;,
    description: &#x22;The type of filter to use (`text`, `number`, `select`, etc.)&#x22;,
  },
  {
    title: &#x22;options&#x22;,
    description: &#x22;For select/multi-select filters, an array of options with `label`, `value`, and optional `count` and `icon`&#x22;,
  },
  {
    title: &#x22;range&#x22;,
    description: &#x22;For range filters, a tuple of `[min, max]` values&#x22;,
  },
  {
    title: &#x22;unit&#x22;,
    description: &#x22;For numeric filters, the unit to display (e.g., 'hr', '$')&#x22;,
  },
  {
    title: &#x22;icon&#x22;,
    description: &#x22;The react component to use as an icon for the column&#x22;,
  },
]"
/>

#### Filter Variants [#filter-variants]

Available filter variants for [column meta](#column-meta).

<PropsTable
  variant="title"
  data="[
  {
    title: &#x22;text&#x22;,
    description: &#x22;Text search with contains, equals, etc.&#x22;,
  },
  {
    title: &#x22;number&#x22;,
    description: &#x22;Numeric filters with equals, greater than, less than, etc.&#x22;,
  },
  {
    title: &#x22;range&#x22;,
    description: &#x22;Range filters with minimum and maximum values&#x22;,
  },
  {
    title: &#x22;date&#x22;,
    description: &#x22;Date filters with equals, before, after, etc.&#x22;,
  },
  {
    title: &#x22;dateRange&#x22;,
    description: &#x22;Date range filters with start and end dates&#x22;,
  },
  {
    title: &#x22;boolean&#x22;,
    description: &#x22;Boolean filters with true/false values&#x22;,
  },
  {
    title: &#x22;select&#x22;,
    description: &#x22;Single-select filters with predefined options&#x22;,
  },
  {
    title: &#x22;multiSelect&#x22;,
    description: &#x22;Multi-select filters with predefined options&#x22;,
  },
]"
/>

Reference the [TanStack Table Column Definitions Guide](https://tanstack.com/table/latest/docs/guide/column-defs#column-definitions-guide) for detailed column definition guide.

### useDataTable [#usedatatable]

A hook for initializing the data table with state management.

<AutoTypeTable path="./types/radix/data-table.ts" name="UseDataTableProps" />

### DataTable [#datatable]

The main data table component.

<AutoTypeTable path="./types/radix/data-table.ts" name="DataTableProps" />

### DataTableColumnHeader [#datatablecolumnheader]

Custom header component for columns with sorting.

<AutoTypeTable path="./types/radix/data-table.ts" name="DataTableColumnHeaderProps" />

### DataTableToolbar [#datatabletoolbar]

Standard toolbar with filtering and view options.

<AutoTypeTable path="./types/radix/data-table.ts" name="DataTableToolbarProps" />

### DataTableAdvancedToolbar [#datatableadvancedtoolbar]

Advanced toolbar with more comprehensive filtering capabilities.

<AutoTypeTable path="./types/radix/data-table.ts" name="DataTableAdvancedToolbarProps" />

### DataTableViewOptions [#datatableviewoptions]

Controls column visibility and display preferences in the data table.

<AutoTypeTable path="./types/radix/data-table.ts" name="DataTableViewOptionsProps" />

### DataTableSortList [#datatablesortlist]

List of applied sorting with ability to add, remove, and modify sorting.

<AutoTypeTable path="./types/radix/data-table.ts" name="DataTableSortListProps" />

### DataTableFilterList [#datatablefilterlist]

List of applied filters with ability to add, remove, and modify filters.

<AutoTypeTable path="./types/radix/data-table.ts" name="DataTableFilterListProps" />

### DataTableFilterMenu [#datatablefiltermenu]

Filter menu with ability to add, remove, and modify filters.

<AutoTypeTable path="./types/radix/data-table.ts" name="DataTableFilterMenuProps" />

### DataTablePagination [#datatablepagination]

Pagination controls for the data table.

<AutoTypeTable path="./types/radix/data-table.ts" name="DataTablePaginationProps" />

## Accessibility [#accessibility]

### Keyboard Interactions [#keyboard-interactions]

<KeyboardShortcutsTable
  data="[
  {
    keys: [&#x22;Ctrl + Shift + F&#x22;, &#x22;Cmd + Shift + F&#x22;],
    description: &#x22;Toggles the filter menu.&#x22;,
  },
  {
    keys: [&#x22;Ctrl + Shift + S&#x22;, &#x22;Cmd + Shift + S&#x22;],
    description: &#x22;Toggles the sort menu.&#x22;,
  },
  {
    keys: [&#x22;Backspace&#x22;, &#x22;Delete&#x22;],
    description: &#x22;Removes the focused filter/sort item. Removes the last applied filter/sort when menu trigger is focused.&#x22;,
  },
]"
/>

## Features [#features]

* **Advanced Filtering** - Multiple filter types (text, number, date, select, multi-select) with customizable operators
* **URL State Management** - Sync table state with URL search params using [nuqs](https://nuqs.47ng.com)
* **Sorting** - Multi-column sorting with persistent state
* **Pagination** - Server-side or client-side pagination with customizable page sizes
* **Column Visibility** - Toggle column visibility with view options menu
* **Row Selection** - Single or multi-row selection with action bar
* **Column Pinning** - Pin columns to left or right for better UX
* **Keyboard Navigation** - Full keyboard support with shortcuts for filter and sort menus
* **Responsive** - Mobile-first design with overflow handling
* **Customizable** - Flexible API for custom filters, columns, and actions

## Credits [#credits]

* [shadcn/ui](https://github.com/shadcn-ui/ui/tree/main/apps/www/app/\(app\)/examples/tasks) - For the initial implementation of the data table.
