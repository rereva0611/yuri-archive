// 导航栏：所有页面共用
const navSearchForm = document.getElementById("navSearchForm");
const navSearchInput = navSearchForm.querySelector('input[name="q"]');
const navSearchButton = navSearchForm.querySelector('input[type="submit"]');

// 档案页：其他页面没有这些元素，取得的值是 null
const searchForm = document.getElementById("archiveSearchForm");
const searchInput = document.getElementById("archiveSearch");
const statusFilter = document.getElementById("statusFilter");
const lengthFilter = document.getElementById("lengthFilter");
const yuriTypeFilter = document.getElementById("yuriTypeFilter");
const completedFilter = document.getElementById("completedFilter");
const hLevelFilter = document.getElementById("hLevelFilter");
const workList = document.getElementById("workList");
const noResults = document.getElementById("noResults");
const archiveCount = document.getElementById("archiveCount");

let keyword = "";
let archiveLoaded = false;

// 档案页状态：从网址读取，保存时不刷新页面
const archiveState = {
  load() {
    const params = new URLSearchParams(window.location.search);

    searchInput.value = (params.get("q") || "").trim();
    keyword = searchInput.value;

    for (const name of [
      "status",
      "length",
      "sort",
      "yuriType",
      "completed",
      "hLevel",
    ]) {
      const select = document.getElementById(name + "Filter");

      select.value = params.get(name) || select.options[0].value;

      // 网址中的值无效时，恢复第一个选项
      if (select.selectedIndex === -1) select.selectedIndex = 0;
    }
  },

  save() {
    const url = new URL(window.location.href);
    const values = {
      q: keyword,
      status: statusFilter.value,
      length: lengthFilter.value,
      yuriType: yuriTypeFilter.value,
      completed: completedFilter.value,
      hLevel: hLevelFilter.value,
      sort: document.getElementById("sortFilter").value,
    };

    for (const name in values) {
      const value = values[name];

      // 默认条件不写进网址
      if (value === "" || (name === "sort" && value === "id")) {
        url.searchParams.delete(name);
      } else {
        url.searchParams.set(name, value);
      }
    }

    history.replaceState(history.state, "", url);
  },
};

// 按条件筛选作品，并更新结果数量
function filterWorks() {
  if (!archiveLoaded) return;

  const selectedStatus = statusFilter.value;
  const selectedLength = lengthFilter.value;
  const selectedYuriType = yuriTypeFilter.value;
  const selectedCompleted = completedFilter.value;
  const selectedHLevel = hLevelFilter.value;
  let visibleCount = 0;

  for (const workItem of workList.children) {
    const matchesSearch =
      workItem.dataset.search.includes(keyword.toLowerCase());
    const matchesStatus =
      selectedStatus === "" || workItem.dataset.status === selectedStatus;
    const matchesLength =
      selectedLength === "" || workItem.dataset.length === selectedLength;
    const matchesYuriType =
      selectedYuriType === "" || workItem.dataset.yuriType === selectedYuriType;
    const matchesCompleted =
      selectedCompleted === "" || workItem.dataset.completed === selectedCompleted;
    const matchesHLevel =
      selectedHLevel === "" || workItem.dataset.hLevel === selectedHLevel;

    workItem.hidden = !(
      matchesSearch &&
      matchesStatus &&
      matchesLength &&
      matchesYuriType &&
      matchesCompleted &&
      matchesHLevel
    );

    if (!workItem.hidden) visibleCount += 1;
  }

  archiveCount.textContent =
    "找到 " + visibleCount + " 部作品（共 " + workList.children.length + " 部）";
  noResults.hidden = visibleCount > 0;
  archiveState.save();
}

// 由档案页在生成全部作品后调用
function initArchiveSearch() {
  archiveLoaded = true;

  const sortFilter = document.getElementById("sortFilter");

  function sortWorks() {
    const sortBy = sortFilter.value;
    const workItems = Array.from(workList.children);

    workItems.sort(function (a, b) {
      // 评分、喜爱程度：从高到低
      if (sortBy !== "id") {
        const difference =
          Number(b.dataset[sortBy]) - Number(a.dataset[sortBy]);

        if (difference !== 0) return difference;
      }

      // 默认排序，以及同分时：按 ID 从小到大
      return Number(a.dataset.id) - Number(b.dataset.id);
    });

    // 移动已有卡片，保留原来的筛选结果
    for (const workItem of workItems) {
      workList.appendChild(workItem);
    }

    archiveState.save();
  }

  sortFilter.addEventListener("change", sortWorks);

  const resetButton = document.getElementById("resetFilters");
  resetButton.disabled = false;
  resetButton.addEventListener("click", () => {
    keyword = "";
    searchInput.value = "";
    navSearchInput.value = "";
    statusFilter.value = "";
    lengthFilter.value = "";
    yuriTypeFilter.value = "";
    completedFilter.value = "";
    hLevelFilter.value = "";
    sortFilter.value = "id";

    updateNavSearchButton();
    sortWorks();
    filterWorks();
  });

  sortWorks();
  filterWorks();
}

function updateNavSearchButton() {
  navSearchButton.disabled = navSearchInput.value.trim() === "";
}

navSearchInput.addEventListener("input", updateNavSearchButton);
updateNavSearchButton();

navSearchForm.addEventListener("submit", (event) => {
  const value = navSearchInput.value.trim();

  if (value === "") {
    event.preventDefault();
    return;
  }

  navSearchInput.value = value;

  // 其他页面由表单正常跳转；档案页直接更新结果
  if (searchForm) {
    event.preventDefault();

    searchInput.value = value;
    keyword = value;
    statusFilter.value = "";
    lengthFilter.value = "";
    yuriTypeFilter.value = "";
    completedFilter.value = "";
    hLevelFilter.value = "";

    filterWorks();
  }
});

// 只有档案页才执行这部分
if (searchForm) {
  archiveState.load();

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();

    keyword = searchInput.value.trim();
    filterWorks();
  });

  searchInput.addEventListener("input", () => {
    if (searchInput.value === "") {
      keyword = "";
      filterWorks();
    }
  });

  statusFilter.addEventListener("change", filterWorks);
  lengthFilter.addEventListener("change", filterWorks);
  yuriTypeFilter.addEventListener("change", filterWorks);
  completedFilter.addEventListener("change", filterWorks);
  hLevelFilter.addEventListener("change", filterWorks);
}
