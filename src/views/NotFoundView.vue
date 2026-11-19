<template>
  <main>
    <h2>没有找到该页面哦</h2>

    <RouterLink :to="{ name: 'home' }">
      返回首页
    </RouterLink>

    <RouterLink :to="{ name: 'archive' }">
      浏览档案
    </RouterLink>
  </main>
</template>