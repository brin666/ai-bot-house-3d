export function renderLayout(app: HTMLElement) {
  app.innerHTML = `
<header>
  <div class="brand">
    <span class="brandmark" aria-hidden="true"></span>
    <div>
      <strong>BOT HOUSE</strong>
      <small>像素小屋 · 本地演播</small>
    </div>
  </div>
  <div class="header-right">
    <span class="online"><i aria-hidden="true"></i>本地演播</span>
    <button id="mode" class="mode" type="button" aria-label="切换竖屏直播模式" title="切换竖屏直播模式">竖屏直播</button>
  </div>
  <div class="live-summary" aria-live="polite">
    <div class="live-heading"><span class="live-mark" aria-hidden="true">LIVE</span><span>此刻</span><span class="live-local">本地模拟</span></div>
    <div class="live-readout"><div class="live-current"><small>BOT 动态</small><strong id="live-now">BOT 正在探索</strong></div><div class="live-balance"><small>虚拟金币</small><strong id="livecoins">250</strong></div></div>
    <small id="live-log" class="live-recent"></small>
    <p id="live-save-alert" class="save-alert" role="alert" hidden></p>
  </div>
</header>
<main>
  <section class="stage">
    <div class="stage-head">
      <div class="stage-statusline">
        <span class="pill">直播预览</span>
        <span class="stage-label">2 个房间 / 小小生活</span>
      </div>
      <div class="paper-controls">
        <label for="dither-strength">抖色</label>
        <input id="dither-strength" type="range" min="0" max="1" step="0.01" value="1" aria-label="抖色强度">
        <button id="dither" type="button" aria-label="关闭抖色">抖色：开启</button>
      </div>
    </div>
    <div id="canvas"></div>
    <div id="event-flash" class="event-flash" aria-live="polite" hidden></div>
    <div id="item-details" class="item-details" role="dialog" aria-label="家具详情" hidden>
      <button id="close-detail" type="button" aria-label="关闭家具详情">×</button>
      <small>已放置的家具</small>
      <strong id="detail-name"></strong>
      <span id="detail-price"></span>
      <span>放在房间里</span>
      <button id="relocate-furniture" class="relocate-furniture" type="button">自动调整位置</button>
    </div>
    <div class="stage-bottom">
      <div><span class="tiny-dot"></span><strong id="status">BOT 正在探索</strong><span class="divider">/</span><span>拖动旋转 · 滚轮缩放</span></div>
    </div>
    <div class="live-overlay">
      <div class="live-sink" hidden>
        <small id="live-goal"></small>
        <i id="liveprogress"></i>
      </div>
    </div>
  </section>
  <aside class="rail">
    <div class="rail-hero">
      <p class="eyebrow">小小生活</p>
      <h1>一间小屋，<em>慢慢长大。</em></h1>
      <p class="intro">陪一只小小的 Bot，用虚拟金币把空房间布置起来。</p>
      <p id="save-alert" class="save-alert" role="alert" hidden></p>
      <div class="balance">
        <span class="balance-kicker">虚拟金币</span>
        <strong id="coins">250</strong>
        <div class="progress" aria-hidden="true"><i id="progress"></i></div>
        <div class="balance-foot"><span>下一间房</span><span id="room-goal">目标 500</span></div>
        <button id="buy-room" class="buy-room" type="button">扩建新房间 · 500 金币</button>
      </div>
    </div>
    <div class="rail-actions">
      <div class="section-title"><div><h2>互动</h2></div></div>
      <div class="event-grid">
        <button type="button" data-event="like" aria-label="点赞，增加 10 金币">
          <svg class="event-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.1c0 5.1-8.8 11-8.8 11S3.2 13.2 3.2 8.1A4.8 4.8 0 0 1 12 5.7a4.8 4.8 0 0 1 8.8 2.4Z"/></svg>
          <strong class="event-count" aria-live="polite">0</strong><span>点赞</span><small>每次 +10 金币</small>
        </button>
        <button type="button" data-event="follow" aria-label="关注，触发 BOT 庆祝">
          <svg class="event-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.8 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17l-5.6 3 1.1-6.2L3 9.4l6.2-.9L12 2.8Z"/></svg>
          <strong class="event-count" aria-live="polite">0</strong><span>关注</span><small>每次庆祝</small>
        </button>
        <button type="button" data-event="gift" aria-label="送礼，增加 50 金币">
          <svg class="event-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10h18v11H3zM2 6h20v4H2zM12 6v15M12 6H8.3a2.3 2.3 0 1 1 2.1-3.2C11.2 4.3 12 6 12 6Zm0 0h3.7a2.3 2.3 0 1 0-2.1-3.2C12.8 4.3 12 6 12 6Z"/></svg>
          <strong class="event-count" aria-live="polite">0</strong><span>礼物</span><small>每次 +50 金币</small>
        </button>
      </div>
      <button id="gift-furniture" class="gift-furniture" type="button">模拟礼物 · 送来盆栽</button>
      <p class="hint">+50 虚拟金币，Bot 会搬进一盆植物。不能兑换真实收入。</p>
      <div class="actions">
        <span>陪 Bot</span>
        <div>
          <button type="button" data-activity="bed">休息</button>
          <button type="button" data-activity="table">阅读</button>
          <button type="button" data-activity="plant">看植物</button>
          <button type="button" data-activity="chair">小憩</button>
          <button type="button" data-activity="lamp">看灯</button>
        </div>
      </div>
    </div>
    <div class="rail-scroll">
      <div class="rail-journal">
        <div class="journal-head"><div><h2>小屋日记</h2></div><span id="live-activity" class="live-activity" aria-live="polite"></span></div>
        <div id="logs"></div>
      </div>
      <div class="rail-shop">
        <div class="section-title"><div><h2>家具商店</h2></div><span>01 — 05</span></div>
        <p class="hint">点一件，Bot 会亲自搬回家。</p>
        <div id="shop"></div>
        <div class="owned-furniture">
          <label for="owned-select">已放置的家具</label>
          <div>
            <select id="owned-select" aria-label="已放置家具"></select>
            <button id="inspect-furniture" type="button">查看</button>
          </div>
        </div>
        <button id="reset-save" class="reset-save" type="button" aria-label="重置存档">重置存档</button>
      </div>
      <p class="note">金币只保存在这台浏览器里，用来本地布置，不能兑换成真实收入。</p>
    </div>
  </aside>
</main>`;
}
