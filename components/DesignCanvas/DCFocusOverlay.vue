<script setup>
const ctx = inject('dcCtx')
const { focus, setFocus, sections, sectionOrder, sectionMeta, focusRegistry } = ctx

const entry = computed(() => focusRegistry.value[focus.value])

const sectionId = computed(() => {
  const parts = (focus.value || '').split('/')
  return parts.slice(0, -1).join('/')
})
const artboardId = computed(() => {
  const parts = (focus.value || '').split('/')
  return parts[parts.length - 1]
})
const secIdx = computed(() => sectionOrder.value.indexOf(sectionId.value))

// Effective peer order within section (persisted → source)
const peers = computed(() => {
  const sid = sectionId.value
  const srcIds = sectionMeta.value[sid]?.slotIds || []
  const kept = (sections.value[sid]?.order || []).filter((k) => srcIds.includes(k))
  return [...kept, ...srcIds.filter((k) => !kept.includes(k))]
})
const idx = computed(() => peers.value.indexOf(artboardId.value))

const label = computed(() => {
  const sid = sectionId.value
  const aid = artboardId.value
  return (sections.value[sid]?.labels || {})[aid] ?? entry.value?.label
})

const sectionTitle = computed(() => {
  const sid = sectionId.value
  return sections.value[sid]?.title ?? sectionMeta.value[sid]?.title
})
const sectionSubtitle = computed(() => sectionMeta.value[sectionId.value]?.subtitle)

function go(d) {
  const p = peers.value
  const n = p[(idx.value + d + p.length) % p.length]
  if (n) setFocus(`${sectionId.value}/${n}`)
}

function goSection(d) {
  const so = sectionOrder.value
  const ns = so[(secIdx.value + d + so.length) % so.length]
  const first = sectionMeta.value[ns]?.slotIds[0]
  if (first) setFocus(`${ns}/${first}`)
}

// Viewport for scale calculation
const vp = ref({ w: 1280, h: 900 })
if (import.meta.client) {
  vp.value = { w: window.innerWidth, h: window.innerHeight }
}

const onResize = () => {
  vp.value = { w: window.innerWidth, h: window.innerHeight }
}
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

const scale = computed(() => {
  const { w, h } = vp.value
  const width = entry.value?.width ?? 260
  const height = entry.value?.height ?? 480
  return Math.max(0.1, Math.min((w - 200) / width, (h - 260) / height, 2))
})

// Keyboard navigation
const onKey = (e) => {
  if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) }
  else if (e.key === 'ArrowRight') { e.preventDefault(); go(1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); goSection(-1) }
  else if (e.key === 'ArrowDown') { e.preventDefault(); goSection(1) }
}
onMounted(() => document.addEventListener('keydown', onKey))
onUnmounted(() => document.removeEventListener('keydown', onKey))

const ddOpen = ref(false)
</script>

<template>
  <div
    @click="setFocus(null)"
    @wheel.prevent
    :style="{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(24,20,16,.6)', backdropFilter: 'blur(14px)',
      fontFamily: 'var(--dc-font)', color: '#fff',
    }"
  >
    <!-- Top bar -->
    <div
      @click.stop
      :style="{
        position: 'absolute', top: 0, left: 0, right: 0, height: '72px',
        display: 'flex', alignItems: 'flex-start', padding: '16px 20px 0', gap: '16px',
      }"
    >
      <!-- Section dropdown -->
      <div style="position: relative">
        <button
          @click="ddOpen = !ddOpen"
          :style="{
            border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer',
            padding: '6px 8px', borderRadius: '6px', textAlign: 'left', fontFamily: 'inherit',
          }"
        >
          <span :style="{ display: 'flex', alignItems: 'center', gap: '8px' }">
            <span :style="{ fontSize: '18px', fontWeight: '600', letterSpacing: '-0.3px' }">{{ sectionTitle }}</span>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" style="opacity: .7">
              <path d="M2 4l3.5 3.5L9 4"/>
            </svg>
          </span>
          <span v-if="sectionSubtitle" :style="{ display: 'block', fontSize: '13px', opacity: '.6', fontWeight: '400', marginTop: '2px' }">{{ sectionSubtitle }}</span>
        </button>

        <div
          v-if="ddOpen"
          :style="{
            position: 'absolute', top: '100%', left: 0, marginTop: '4px',
            background: '#2a251f', borderRadius: '8px',
            boxShadow: '0 8px 32px rgba(0,0,0,.4)', padding: '4px', minWidth: '200px', zIndex: 10,
          }"
        >
          <button
            v-for="sid in sectionOrder"
            :key="sid"
            @click="() => { ddOpen = false; const f = sectionMeta[sid]?.slotIds[0]; if (f) setFocus(`${sid}/${f}`) }"
            :style="{
              display: 'block', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
              background: sid === sectionId ? 'rgba(255,255,255,.1)' : 'transparent', color: '#fff',
              padding: '8px 12px', borderRadius: '5px', fontSize: '14px',
              fontWeight: sid === sectionId ? '600' : '400', fontFamily: 'inherit',
            }"
          >
            {{ sections[sid]?.title ?? sectionMeta[sid]?.title }}
          </button>
        </div>
      </div>

      <div style="flex: 1" />

      <!-- Close -->
      <button
        @click="setFocus(null)"
        @mouseenter="(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.12)')"
        @mouseleave="(e) => (e.currentTarget.style.background = 'transparent')"
        :style="{
          border: 'none', background: 'transparent', color: 'rgba(255,255,255,.7)',
          width: '32px', height: '32px', borderRadius: '16px', fontSize: '20px',
          cursor: 'pointer', lineHeight: '1', transition: 'background .12s',
        }"
      >×</button>
    </div>

    <!-- Scaled artboard -->
    <div
      :style="{
        position: 'absolute', top: '64px', bottom: '56px', left: '100px', right: '100px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px',
      }"
    >
      <div
        @click.stop
        :style="{
          width: (entry?.width ?? 260) * scale + 'px',
          height: (entry?.height ?? 480) * scale + 'px',
          position: 'relative',
        }"
      >
        <div
          :style="{
            width: (entry?.width ?? 260) + 'px',
            height: (entry?.height ?? 480) + 'px',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            background: '#fff', borderRadius: '2px', overflow: 'hidden',
            boxShadow: '0 20px 80px rgba(0,0,0,.4)',
          }"
        >
          <component v-if="entry?.ContentComponent" :is="entry.ContentComponent" />
        </div>
      </div>

      <!-- Label + index -->
      <div @click.stop :style="{ fontSize: '14px', fontWeight: '500', opacity: '.85', textAlign: 'center' }">
        {{ label }}
        <span :style="{ opacity: '.5', marginLeft: '10px', fontVariantNumeric: 'tabular-nums' }">
          {{ idx + 1 }} / {{ peers.length }}
        </span>
      </div>
    </div>

    <!-- Left arrow -->
    <button
      @click.stop="go(-1)"
      :style="{
        position: 'absolute', top: '50%', left: '28px', transform: 'translateY(-50%)',
        border: 'none', background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.9)',
        width: '44px', height: '44px', borderRadius: '22px', fontSize: '18px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s',
      }"
      @mouseenter="(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.18)')"
      @mouseleave="(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.08)')"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M11 3L5 9l6 6"/>
      </svg>
    </button>

    <!-- Right arrow -->
    <button
      @click.stop="go(1)"
      :style="{
        position: 'absolute', top: '50%', right: '28px', transform: 'translateY(-50%)',
        border: 'none', background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.9)',
        width: '44px', height: '44px', borderRadius: '22px', fontSize: '18px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s',
      }"
      @mouseenter="(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.18)')"
      @mouseleave="(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.08)')"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M7 3l6 6-6 6"/>
      </svg>
    </button>

    <!-- Dot navigation -->
    <div
      @click.stop
      :style="{
        position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: '8px',
      }"
    >
      <button
        v-for="(p, i) in peers"
        :key="p"
        @click="setFocus(`${sectionId}/${p}`)"
        :style="{
          border: 'none', padding: 0, cursor: 'pointer',
          width: '6px', height: '6px', borderRadius: '3px',
          background: i === idx ? '#fff' : 'rgba(255,255,255,.3)',
        }"
      />
    </div>
  </div>
</template>
