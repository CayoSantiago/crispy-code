'use client'

import { Button } from '@repo/ui/components/button'
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
} from '@repo/ui/components/combobox'
import {
  BookOpenIcon,
  BrainCogIcon,
  BugOffIcon,
  FoldersIcon,
  GitBranchIcon,
  ImageIcon,
  MessageCircleQuestionIcon,
  PlusIcon,
} from 'lucide-react'
import { Fragment, useRef, useState } from 'react'

const actions = [
  {
    value: 'chat',
    items: [
      { label: 'Plan', value: 'chat-plan', Icon: GitBranchIcon },
      { label: 'Debug', value: 'chat-debug', Icon: BugOffIcon },
      { label: 'Multitask', value: 'chat-multitask', Icon: FoldersIcon },
      { label: 'Ask', value: 'chat-ask', Icon: MessageCircleQuestionIcon },
    ],
  },
  {
    value: 'actions',
    items: [
      { label: 'Image', value: 'action-image', Icon: ImageIcon },
      { label: 'Models', value: 'action-models', Icon: BookOpenIcon },
      { label: 'MCP Servers', value: 'action-mcp-servers', Icon: BrainCogIcon },
    ],
  },
]

export function CursorAddButton() {
  const modelsRef = useRef(null)
  const [openModels, setOpenModels] = useState(false)

  return (
    <>
      <Combobox<(typeof actions)[number]['items'][number]>
        items={actions}
        autoHighlight
        onItemHighlighted={(val) => {
          if (val?.value === 'action-models') {
            setOpenModels(true)
          } else if (val && openModels) {
            setOpenModels(false)
          }
        }}
      >
        <ComboboxTrigger
          render={
            <Button
              variant='secondary'
              size='icon'
              className='rounded-full [&_svg]:last:hidden text-muted-foreground'
            />
          }
        >
          <PlusIcon />
        </ComboboxTrigger>
        <ComboboxContent className='w-48'>
          <ComboboxInput
            className='ring-0! bg-transparent!'
            placeholder='Add agents, contexts, tools...'
            showTrigger={false}
          />
          <ComboboxEmpty>No results found.</ComboboxEmpty>
          <ComboboxList>
            {(group) => (
              <Fragment key={group.value}>
                <ComboboxGroup items={group.items}>
                  <ComboboxCollection>
                    {(item) => (
                      <ComboboxItem
                        data-active={
                          item.value === 'action-models' ? openModels : false
                        }
                        ref={
                          item.value === 'action-models' ? modelsRef : undefined
                        }
                        key={item.value}
                        value={item}
                        className='data-active:bg-accent'
                      >
                        <item.Icon />
                        <span>{item.label}</span>
                      </ComboboxItem>
                    )}
                  </ComboboxCollection>
                </ComboboxGroup>
                <ComboboxSeparator className='last:hidden' />
              </Fragment>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

      <ModelSelect
        anchor={modelsRef}
        open={openModels}
        onOpenChange={setOpenModels}
      />
    </>
  )
}

type Model = {
  label: string
  value: string
  strength?: string
}

const models: Model[] = [
  {
    label: 'Cursor Grok 4.5',
    strength: 'High Fast',
    value: 'cursor-grok-4.5',
  },
  { label: 'Composer 2.5', strength: 'Fast', value: 'composer-2.5' },
  { label: 'Opus 5', strength: 'High', value: 'opus-5' },
  { label: 'Opus 4.8', strength: 'High', value: 'opus-4.8' },
  { label: 'GPT-5.6 Sol', strength: 'Medium', value: 'gpt-5.6-sol' },
  { label: 'Fable 5', strength: 'High', value: 'fable-5' },
  { label: 'Sonnet 5', strength: 'High', value: 'sonnet-5' },
  { label: 'GPT-5.6 Terra', strength: 'Medium', value: 'gpt-5.6-terra' },
  { label: 'Opus 4.5', value: 'opus-4.5' },
  { label: 'GPT-5.2', strength: 'Medium', value: 'gpt-5.2' },
  { label: 'Sonnet 4.5', value: 'sonnet-4.5' },
]

function ModelSelect({
  anchor,
  ...props
}: React.ComponentProps<typeof Combobox<Model>> &
  Pick<React.ComponentProps<typeof ComboboxContent>, 'anchor'>) {
  return (
    <Combobox<Model>
      items={models}
      autoHighlight
      defaultValue={models[0]}
      isItemEqualToValue={(item, val) => item.value === val.value}
      {...props}
    >
      <ComboboxContent anchor={anchor} side='right' className='w-48'>
        <ComboboxInput
          className='ring-0! bg-transparent!'
          showTrigger={false}
          placeholder='Search models'
        />
        <ComboboxSeparator />
        <ComboboxEmpty>No models found.</ComboboxEmpty>
        <ComboboxList>
          {(item: Model) => (
            <ComboboxItem key={item.label} value={item}>
              <span className=''>{item.label}</span>
              {item.strength ? (
                <span className='text-muted-foreground'>{item.strength}</span>
              ) : null}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
