<template>
  <div class="appbar__main" style="background: #000000; margin-bottom:20px;">
    <nav class="appbar__nav">
      <a><nuxt-link to="/">Home</nuxt-link></a>
      <a><nuxt-link to="/group">Group</nuxt-link></a>
      <a><nuxt-link to="/country">Country</nuxt-link></a>
      <a><nuxt-link to="/usaid">USAID</nuxt-link></a>
      <a><nuxt-link to="/eu">EU</nuxt-link></a>
    </nav>
  </div>
  <slot />
</template>