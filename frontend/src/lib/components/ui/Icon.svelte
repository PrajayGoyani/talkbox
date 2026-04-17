<script lang="ts">
  /**
   * Icon component using CSS mask-image for dynamic loading.
   * SVGs are stored in /public/icons/${name}.svg
   */
  const VALID_ICONS = [
    "back",
    "sidebar",
    "search",
    "send",
    "notifications",
    "settings",
    "profile",
    "check",
    "close",
    "clock",
    "chevron-down",
    "nav-chat",
    "logout",
    "add",
    "copy",
    "loader",
    "sun",
    "moon",
    "eye",
    "eye-off",
    "bolt",
    "lock",
    "grid",
    "camera",
    "edit",
    "smile",
    "smile-plus",
  ] as const;

  type IconName = (typeof VALID_ICONS)[number];

  let {
    name,
    class: className = "w-5 h-5",
    ...rest
  }: {
    name: IconName | string;
    class?: string;
    [key: string]: any;
  } = $props();

  const isValidIcon = (value: string): value is IconName => {
    return VALID_ICONS.includes(value as IconName);
  };
</script>

<!-- 
  We use a span with mask-image to load the SVG and background-color: currentColor
  to ensure the icon inherits the surrounding text color.
-->
{#if isValidIcon(name)}
  <span
    class="icon-container shrink-0 {className}"
    style:--icon-url="url('/icons/{name}.svg')"
    aria-hidden="true"
    {...rest}
  ></span>
{/if}

<style>
  .icon-container {
    display: block;
    background-color: currentColor;

    /* Cross-browser mask properties */
    mask-image: var(--icon-url);
    mask-size: contain;
    mask-repeat: no-repeat;
    mask-position: center;

    -webkit-mask-image: var(--icon-url);
    -webkit-mask-size: contain;
    -webkit-mask-repeat: no-repeat;
    -webkit-mask-position: center;
  }
</style>
