'use client'

import { Tabs, TabsList, TabsTrigger } from '@repo/ui/components/tabs'
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
} from 'react'
import { InlineScript } from '@/components/inline-script'
import { useSetSearchQuery } from '@/hooks/use-set-search-query'

const SearchContext = createContext({ queryKey: '' })

export function SearchQueryTabs({
  queryKey,
  defaultValue,
  clearOnDefault = true,
  children,
  ...props
}: Omit<
  React.ComponentProps<typeof Tabs>,
  'value' | 'onValueChange' | 'defaultValue'
> & {
  queryKey: string
  defaultValue?: string
  clearOnDefault?: boolean
}) {
  const _defaultValue = defaultValue ?? ''

  const [tab, setTab] = useState(() => {
    if (typeof window === 'undefined') return _defaultValue
    const search = new URLSearchParams(location.search)
    return decodeURIComponent(search.get(queryKey) ?? _defaultValue)
  })

  const setSearch = useSetSearchQuery(queryKey)

  // biome-ignore lint/correctness/useExhaustiveDependencies: setSearch is already momoized
  const handleValueChange = useCallback((val: string) => {
    setSearch(clearOnDefault && val === _defaultValue ? null : val)
    setTab(val)
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: update stale state from activity component on page nav
  useLayoutEffect(() => {
    if (typeof window !== 'undefined') {
      const search = new URLSearchParams(location.search)
      setTab(decodeURIComponent(search.get(queryKey) ?? _defaultValue))
    }
  }, [])

  return (
    <>
      <Tabs value={tab} onValueChange={handleValueChange} {...props}>
        <SearchContext.Provider value={{ queryKey }}>
          {children}
        </SearchContext.Provider>
      </Tabs>

      <InlineScript
        html={`{var s=new URLSearchParams(location.search);var v=decodeURIComponent(s.get('${queryKey}')??'${_defaultValue}');var e=document.getElementById('tab-query-tabs');var b=e.querySelectorAll(':scope>button');b.forEach(function (b){b.setAttribute('aria-selected','false');b.removeAttribute('data-active');b.removeAttribute('data-composite-item-active')});var a=document.getElementById(\`${queryKey}-query-tabs-trigger-\${v}\`);if(a){a.setAttribute('aria-selected','true');a.setAttribute('data-active','');a.setAttribute('data-composite-item-active','')}}`}
      />
    </>
  )
}

export function SearchQueryTabsList(
  props: React.ComponentProps<typeof TabsList>,
) {
  const { queryKey } = useContext(SearchContext)

  return <TabsList id={`${queryKey}-query-tabs`} {...props} />
}

export function SearchQueryTabsTrigger(
  props: React.ComponentProps<typeof TabsTrigger>,
) {
  const { queryKey } = useContext(SearchContext)

  return (
    <TabsTrigger
      id={`${queryKey}-query-tabs-trigger-${props.value}`}
      {...props}
    />
  )
}

// +-----------------------+
// | Example with Children |
// +-----------------------+
//
// export function SearchQueryTabs({
//   queryKey,
//   defaultValue,
//   clearOnDefault = true,
//   children,
//   ...props
// }: Omit<
//   React.ComponentProps<typeof TabsList>,
//   'value' | 'onValueChange' | 'defaultValue'
// > & {
//   queryKey: string
//   defaultValue?: string
//   clearOnDefault?: boolean
// }) {
//   const _defaultValue = defaultValue ?? ''

//   const [tab, setTab] = useState(() => {
//     if (typeof window === 'undefined') return _defaultValue
//     const search = new URLSearchParams(location.search)
//     return decodeURIComponent(search.get(queryKey) ?? _defaultValue)
//   })

//   const setSearch = useSetSearchQuery(queryKey)

//   // biome-ignore lint/correctness/useExhaustiveDependencies: setSearch is already momoized
//   const handleValueChange = useCallback((val: string) => {
//     setSearch(clearOnDefault && val === _defaultValue ? null : val)
//     setTab(val)
//   }, [])

//   return (
//     <>
//       <Tabs value={tab} onValueChange={handleValueChange}>
//         <TabsList id={`${queryKey}-query-tabs`} {...props}>
//           {Children.map(children, (child) =>
//             isValidElement<{ value?: string; id?: string }>(child)
//               ? cloneElement(child, {
//                   id: `${queryKey}-query-tabs-trigger-${child.props.value}`,
//                 })
//               : child,
//           )}
//         </TabsList>
//       </Tabs>

//       <InlineScript
//         html={`{var s=new URLSearchParams(location.search);var v=decodeURIComponent(s.get('${queryKey}')??'${_defaultValue}');var e=document.getElementById('tab-query-tabs');var b=e.querySelectorAll(':scope>button');b.forEach(function (b){b.setAttribute('aria-selected','false');b.removeAttribute('data-active');b.removeAttribute('data-composite-item-active')});var a=document.getElementById(\`${queryKey}-query-tabs-trigger-\${v}\`);if(a){a.setAttribute('aria-selected','true');a.setAttribute('data-active','');a.setAttribute('data-composite-item-active','')}}`}
//       />
//     </>
//   )
// }
