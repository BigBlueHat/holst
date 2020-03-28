<script>
module.exports = {
  props: {
    show: Boolean
  },
  data() {
    return {
      username: '',
      password: '',
      url: ''
    };
  },
  methods: {
    showStyles() {
      return this.show ? 'display: flex !important' : '';
    }
  }
};
</script>

<template>
  <div
    class="ui dimmer modals page transition"
    :class="{ visible: show, active: show }"
    :style="showStyles"
  >
    <div
      class="ui small modal transition active scrolling"
      :class="{ visible: show, active: show }"
    >
      <div class="content">
        <div class="ui form">
          <div class="fields">
            <div class="four wide field">
              <label>Username</label>
              <input
                v-model="username"
                type="text"
                placeholder="username"
              >
            </div>
            <div class="four wide field">
              <label>Password</label>
              <input
                v-model="password"
                type="password"
                placeholder="password"
              >
            </div>
            <div class="eight wide field">
              <label>CouchDB or PouchDB URL</label>
              <div class="ui input">
                <input
                  v-model="url"
                  type="text"
                  placeholder="https://example.com/database"
                >
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="actions">
        <div
          class="ui cancel icon button"
          @click="$emit('hiding')"
        >
          <i class="close icon" /> Cancel
        </div>
        <button
          class="ui positive icon button"
          @click="$emit('syncing', { url, username, password })"
        >
          <i class="random icon" /> Sync
        </button>
      </div>
    </div>
  </div>
</template>
