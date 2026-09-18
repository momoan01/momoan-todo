const { Plugin, ItemView, Notice, setIcon, PluginSettingTab, Setting } = require('obsidian');

const VIEW_TYPE = 'momoan-todo-view';
const DEPRECATED_WIDGET_NOTE_FILENAME = '오늘 할 일 위젯.md';
const DEPRECATED_WIDGET_MARKER = '%% momoan-todo-widget:auto-generated %%';

/*
 * v0.8 settings architecture
 * --------------------------
 * Runtime code still reads the familiar path/category globals for backwards
 * compatibility, but their values now come from saved plugin settings.
 * This keeps the existing markdown format stable while removing Momoan's
 * personal Vault layout from the public default.
 */
const SETTINGS_SCHEMA_VERSION = 2;
const TAXONOMY_ID_SCHEMA_VERSION = 1;
const ONBOARDING_SCHEMA_VERSION = 3;
const LEGACY_TAXONOMY_RESCUE_VERSION = 4;

const LEGACY_STORAGE_PATHS = Object.freeze({
  root:'03_개인/03_일정·루틴',
  dataFolder:'03_개인/03_일정·루틴/데이터',
  dailyFolder:'03_개인/03_일정·루틴/Daily',
  monthlyRecordFolder:'03_개인/03_일정·루틴/월간 기록',
  monthlyReviewFolder:'03_개인/03_일정·루틴/월간 회고',
  taskHubPath:'03_개인/03_일정·루틴/전체 할 일.md',
  routineOverviewPath:'03_개인/03_일정·루틴/루틴 한눈에.md',
  routinePath:'03_개인/03_일정·루틴/루틴 원본.md'
});

const DEFAULT_STORAGE_ROOT = 'Momoan Todo';
let ACTIVE_WEEK_START = 'monday';
let ACTIVE_LANGUAGE = 'ko';
let ACTIVE_USE_24_HOUR = true;

const DEFAULT_ACCENT_COLOR = '#7f8792';
const SUPPORTED_LANGUAGES = new Set(['ko','en','ja','zh']);
const UI_TEXT = {
  ko:{
    settingsTitle:'Momoan Todo', startScreen:'시작 가이드 다시 보기', startScreenDesc:'Momoan Todo의 기본 사용법과 표시 규칙을 다시 확인합니다.', open:'열기',
    currentStorage:'현재 저장소', currentStorageDesc:'현재 연결된 Momoan Todo 데이터 위치입니다.', connectStorage:'기존 저장소 연결', connectStorageDesc:'이미 존재하는 Momoan Todo 데이터 폴더를 이동 없이 연결합니다.', connect:'연결', connectConfirm:'이 폴더를 현재 Momoan Todo 저장소로 연결할까요?', connectStorageDone:'기존 저장소에 연결했습니다.', connectStorageInvalid:'인식 가능한 Momoan Todo 데이터가 없습니다.', storageFolder:'저장 폴더 이동', storageFolderDesc:'현재 데이터를 새 폴더로 이동합니다.', move:'이동', moveConfirm:'현재 Momoan Todo 데이터를 새 폴더로 이동할까요?', recoverySnapshot:'수동 복구 스냅샷', recoverySnapshotDesc:'현재 데이터와 분류 설정을 한 파일로 저장합니다. _Backups 폴더에 보관되며 다른 컴퓨터에서도 복구할 수 있습니다.', exportSnapshot:'스냅샷 내보내기', restoreLatestSnapshot:'최신 스냅샷 복구', snapshotExported:'복구 스냅샷을 현재 저장소의 _Backups 폴더에 저장했습니다.', snapshotMissing:'복구 스냅샷을 찾지 못했습니다.', snapshotInvalid:'유효한 Momoan Todo 복구 스냅샷이 아닙니다.', snapshotRestoreConfirm:'최신 복구 스냅샷으로 현재 Momoan Todo 데이터를 교체할까요? 복구 전 상태도 자동 백업됩니다.', snapshotRestored:'복구가 완료되었습니다. Obsidian을 한 번 다시 로드하면 모든 분류와 데이터가 정본 상태로 적용됩니다.', snapshotBackupDone:'현재 상태를 복구 전 백업으로 저장했습니다.', autoSafetyBackup:'자동 안전 백업', autoSafetyBackupDesc:'카테고리 삭제·카테고리 병합·그룹 병합 전에 최근 5개의 복구용 백업을 자동 보관합니다.', restoreAutoBackup:'최근 자동 백업 복구', autoBackupMissing:'자동 안전 백업을 찾지 못했습니다.', autoBackupRestoreConfirm:'가장 최근 자동 안전 백업으로 현재 Momoan Todo 데이터를 복구할까요? 현재 상태도 복구 전 백업으로 저장됩니다.', autoBackupRestored:'최근 자동 안전 백업으로 복구했습니다. Obsidian을 한 번 다시 로드해 주세요.',
    weekStart:'주 시작 요일', weekStartDesc:'캘린더와 날짜 선택기의 한 주 시작 요일입니다.', monday:'월요일', sunday:'일요일',
    holidayRegion:'공휴일 기준', holidayRegionDesc:'캘린더의 공휴일을 선택한 국가 기준으로 표시합니다. 중국은 공식 조정근무일도 함께 반영합니다.', holidayNone:'표시 안 함', holidayKR:'대한민국', holidayUS:'미국 (연방)', holidayJP:'일본', holidayCN:'중국',
    weekendColors:'주말 색상', weekendColorsDesc:'토요일은 파랑, 일요일은 빨강으로 표시합니다. 공휴일은 이 설정과 관계없이 빨강으로 표시됩니다.',
    customHolidays:'추가 공휴일', customHolidaysDesc:'임시공휴일처럼 갑자기 지정된 날을 추가합니다. 쉼표로 구분하고 이름은 선택 사항입니다. 예: 2026-10-02=임시공휴일', customHolidayPlaceholder:'2026-10-02=임시공휴일, 2026-12-31', holidayGeneric:'공휴일', adjustedWorkday:'조정 근무일',
    accentColor:'강조색', accentColorDesc:'Momoan Todo의 선택선과 강조 요소에 사용할 색입니다.', reset:'초기화',
    monthlyReview:'월간 회고', monthlyReviewDesc:'캘린더 아래 월간 회고 영역을 표시합니다.',
    monthCount:'월간 할 일 개수', monthCountDesc:'캘린더 아래에 완료/전체 개수를 표시합니다.',
    monthPercent:'월간 완료율', monthPercentDesc:'캘린더 아래에 완료율을 표시합니다.',
    hour24:'24시간제', hour24Desc:'시간을 24시간제로 표시합니다. 끄면 12시간제로 표시합니다.',
    language:'언어', languageDesc:'Momoan Todo의 인터페이스 언어입니다.', korean:'한국어', english:'English', japanese:'日本語', chinese:'中文',
    displayBasis:'화면 기준', displayBasisDesc:'Minimal 테마와 Pretendard 폰트를 기준으로 다듬었습니다.\n다른 테마·폰트에서도 사용할 수 있지만 간격과 인상이 달라질 수 있습니다.',
    todoList:'투두리스트', today:'오늘', completed:'완료', classification:'분류', addTask:'할 일 추가', routineManager:'루틴 관리', classificationSettings:'분류 설정',
    noRemaining:'남은 할 일 없음', remaining:'남은 할 일 {n}개', emptyToday:'오늘은 비어 있습니다', emptyTodaySub:'필요한 일이 생기면 가볍게 추가해 주세요.',
    monthReview:'월간 회고', reviewWrite:'회고록 작성', imageSave:'이미지 저장', lastMonthChange:'지난달 변화', focusCategory:'집중 카테고리', focusGroup:'집중 그룹', categoryRecord:'카테고리별 기록', reviewJournal:'월간 회고록', noReview:'아직 회고록을 작성하지 않았습니다.',
    prevMonth:'이전 달', nextMonth:'다음 달', chooseMonth:'연도와 월 선택', remainingAria:'남은 할 일 {n}개', allDoneAria:'이 날의 할 일을 모두 완료했습니다.', previewAria:'예정된 루틴이 있습니다.',
    am:'오전', pm:'오후', percentDone:'{n}% 완료', moveStorageDone:'저장 폴더를 이동했습니다.', moveStorageSame:'현재 저장 폴더와 같습니다.', moveStorageCollision:'이동할 위치에 같은 이름의 데이터가 이미 있습니다.', invalidFolder:'저장 폴더 이름을 입력해 주세요.'
  },
  en:{
    settingsTitle:'Momoan Todo', startScreen:'View start guide again', startScreenDesc:'Review the core controls, calendar markers, routines, and monthly review.', open:'Open',
    currentStorage:'Current storage', currentStorageDesc:'The Momoan Todo data location currently in use.', connectStorage:'Connect existing storage', connectStorageDesc:'Connect an existing Momoan Todo data folder without moving files.', connect:'Connect', connectConfirm:'Use this folder as the current Momoan Todo storage?', connectStorageDone:'Connected to existing storage.', connectStorageInvalid:'No recognizable Momoan Todo data was found.', storageFolder:'Move storage folder', storageFolderDesc:'Move the current data to a new folder.', move:'Move', moveConfirm:'Move the current Momoan Todo data to the new folder?', recoverySnapshot:'Manual recovery snapshot', recoverySnapshotDesc:'Save current data and taxonomy into one file under _Backups so it can also be restored on another computer.', exportSnapshot:'Export snapshot', restoreLatestSnapshot:'Restore latest snapshot', snapshotExported:'Recovery snapshot saved in the _Backups folder of the current storage.', snapshotMissing:'No recovery snapshot was found.', snapshotInvalid:'This is not a valid Momoan Todo recovery snapshot.', snapshotRestoreConfirm:'Replace current Momoan Todo data with the latest recovery snapshot? A pre-restore backup will be created automatically.', snapshotRestored:'Restore complete. Reload Obsidian once to apply all taxonomy and data from the snapshot.', snapshotBackupDone:'Current state saved as a pre-restore backup.', autoSafetyBackup:'Automatic safety backup', autoSafetyBackupDesc:'Keep the latest five recovery backups automatically before deleting or merging categories/groups.', restoreAutoBackup:'Restore latest auto backup', autoBackupMissing:'No automatic safety backup was found.', autoBackupRestoreConfirm:'Restore the latest automatic safety backup? The current state will also be backed up first.', autoBackupRestored:'Restored the latest automatic safety backup. Reload Obsidian once.',
    weekStart:'Week starts on', weekStartDesc:'First day of the week in calendars and date pickers.', monday:'Monday', sunday:'Sunday',
    holidayRegion:'Holiday region', holidayRegionDesc:'Show public holidays using the selected country. China also includes official adjusted working days.', holidayNone:'Off', holidayKR:'South Korea', holidayUS:'United States (Federal)', holidayJP:'Japan', holidayCN:'China',
    weekendColors:'Weekend colors', weekendColorsDesc:'Show Saturdays in blue and Sundays in red. Public holidays stay red independently.',
    customHolidays:'Extra holidays', customHolidaysDesc:'Add one-off or temporary holidays. Separate dates with commas; names are optional. Example: 2026-10-02=Special holiday', customHolidayPlaceholder:'2026-10-02=Special holiday, 2026-12-31', holidayGeneric:'Holiday', adjustedWorkday:'Adjusted workday',
    accentColor:'Accent color', accentColorDesc:'Color used for selections and accents in Momoan Todo.', reset:'Reset',
    monthlyReview:'Monthly review', monthlyReviewDesc:'Show the monthly review section below the calendar.',
    monthCount:'Monthly task count', monthCountDesc:'Show completed/total task count below the calendar.',
    monthPercent:'Monthly completion rate', monthPercentDesc:'Show completion percentage below the calendar.',
    hour24:'24-hour time', hour24Desc:'Display times in 24-hour format. Turn off for 12-hour format.',
    language:'Language', languageDesc:'Interface language for Momoan Todo.', korean:'한국어', english:'English', japanese:'日本語', chinese:'中文',
    displayBasis:'Design baseline', displayBasisDesc:'Designed around the Minimal theme and Pretendard font.\nOther themes and fonts work, but spacing and visual balance may differ.',
    todoList:'Todo List', today:'Today', completed:'Done', classification:'Groups', addTask:'Add task', routineManager:'Routines', classificationSettings:'Classification',
    noRemaining:'No tasks remaining', remaining:'{n} remaining', emptyToday:'Nothing here today', emptyTodaySub:'Add a task whenever you need one.',
    monthReview:'Monthly review', reviewWrite:'Write review', imageSave:'Save image', lastMonthChange:'Comparison', focusCategory:'Top category', focusGroup:'Top group', categoryRecord:'By category', reviewJournal:'Monthly notes', noReview:'No monthly review has been written yet.',
    prevMonth:'Previous month', nextMonth:'Next month', chooseMonth:'Choose year and month', remainingAria:'{n} tasks remaining', allDoneAria:'All tasks for this day are complete.', previewAria:'A routine is scheduled.',
    am:'AM', pm:'PM', percentDone:'{n}% complete', moveStorageDone:'Storage folder moved.', moveStorageSame:'This is already the current storage folder.', moveStorageCollision:'Data with the same name already exists at the destination.', invalidFolder:'Enter a storage folder name.'
  },
  ja:{
    settingsTitle:'Momoan Todo', startScreen:'スタートガイドをもう一度見る', startScreenDesc:'基本操作、カレンダー表示、ルーティン、月間レビューを確認します。', open:'開く',
    currentStorage:'現在の保存先', currentStorageDesc:'現在接続している Momoan Todo データの場所です。', connectStorage:'既存の保存先に接続', connectStorageDesc:'既存の Momoan Todo データフォルダへ、ファイルを移動せず接続します。', connect:'接続', connectConfirm:'このフォルダを現在の Momoan Todo 保存先として使用しますか？', connectStorageDone:'既存の保存先に接続しました。', connectStorageInvalid:'認識できる Momoan Todo データが見つかりません。', storageFolder:'保存フォルダを移動', storageFolderDesc:'現在のデータを新しいフォルダへ移動します。', move:'移動', moveConfirm:'現在の Momoan Todo データを新しいフォルダへ移動しますか？', recoverySnapshot:'手動復旧スナップショット', recoverySnapshotDesc:'現在のデータと分類設定を1つのファイルに保存します。_Backups フォルダに保管され、別のパソコンでも復旧できます。', exportSnapshot:'スナップショットを書き出す', restoreLatestSnapshot:'最新スナップショットを復旧', snapshotExported:'復旧スナップショットを現在の保存先の _Backups フォルダに保存しました。', snapshotMissing:'復旧スナップショットが見つかりません。', snapshotInvalid:'有効な Momoan Todo 復旧スナップショットではありません。', snapshotRestoreConfirm:'最新の復旧スナップショットで現在の Momoan Todo データを置き換えますか？ 復旧前の状態も自動でバックアップします。', snapshotRestored:'復旧が完了しました。Obsidian を一度再読み込みすると、分類とデータがスナップショットの状態で適用されます。', snapshotBackupDone:'現在の状態を復旧前バックアップとして保存しました。', autoSafetyBackup:'自動安全バックアップ', autoSafetyBackupDesc:'カテゴリ削除・カテゴリ統合・グループ統合の前に、直近5件の復旧用バックアップを自動保存します。', restoreAutoBackup:'最新の自動バックアップを復旧', autoBackupMissing:'自動安全バックアップが見つかりません。', autoBackupRestoreConfirm:'最新の自動安全バックアップから復旧しますか？ 現在の状態も先にバックアップされます。', autoBackupRestored:'最新の自動安全バックアップから復旧しました。Obsidian を一度再読み込みしてください。',
    weekStart:'週の開始曜日', weekStartDesc:'カレンダーと日付選択の週の開始曜日です。', monday:'月曜日', sunday:'日曜日',
    holidayRegion:'祝日基準', holidayRegionDesc:'選択した国の祝日をカレンダーに表示します。中国は公式の振替出勤日も反映します。', holidayNone:'表示しない', holidayKR:'韓国', holidayUS:'アメリカ（連邦）', holidayJP:'日本', holidayCN:'中国',
    weekendColors:'週末カラー', weekendColorsDesc:'土曜日は青、日曜日は赤で表示します。祝日はこの設定に関係なく赤で表示されます。',
    customHolidays:'追加の祝日', customHolidaysDesc:'臨時祝日などを追加します。カンマ区切りで、名前は任意です。例: 2026-10-02=臨時祝日', customHolidayPlaceholder:'2026-10-02=臨時祝日, 2026-12-31', holidayGeneric:'祝日', adjustedWorkday:'振替出勤日',
    accentColor:'アクセントカラー', accentColorDesc:'選択線や強調表示に使う色です。', reset:'リセット',
    monthlyReview:'月間レビュー', monthlyReviewDesc:'カレンダー下の月間レビューを表示します。',
    monthCount:'月間タスク数', monthCountDesc:'完了数/全体数をカレンダー下に表示します。',
    monthPercent:'月間完了率', monthPercentDesc:'完了率をカレンダー下に表示します。',
    hour24:'24時間表示', hour24Desc:'時刻を24時間制で表示します。オフにすると12時間制です。',
    language:'言語', languageDesc:'Momoan Todo の表示言語です。', korean:'한국어', english:'English', japanese:'日本語', chinese:'中文',
    displayBasis:'画面基準', displayBasisDesc:'Minimal テーマと Pretendard フォントを基準に調整しています。\n他のテーマ・フォントでも利用できますが、間隔や印象が変わる場合があります。',
    todoList:'Todo リスト', today:'今日', completed:'完了', classification:'分類', addTask:'タスク追加', routineManager:'ルーティン', classificationSettings:'分類設定',
    noRemaining:'残りタスクなし', remaining:'残り {n}件', emptyToday:'今日は空です', emptyTodaySub:'必要なタスクがあれば追加してください。',
    monthReview:'月間レビュー', reviewWrite:'レビューを書く', imageSave:'画像保存', lastMonthChange:'先月比', focusCategory:'集中カテゴリ', focusGroup:'集中グループ', categoryRecord:'カテゴリ別記録', reviewJournal:'月間レビュー記録', noReview:'まだ月間レビューを書いていません。',
    prevMonth:'前月', nextMonth:'次月', chooseMonth:'年と月を選択', remainingAria:'残りタスク {n}件', allDoneAria:'この日のタスクはすべて完了しました。', previewAria:'予定されたルーティンがあります。',
    am:'午前', pm:'午後', percentDone:'{n}% 完了', moveStorageDone:'保存フォルダを移動しました。', moveStorageSame:'現在の保存フォルダと同じです。', moveStorageCollision:'移動先に同名のデータがあります。', invalidFolder:'保存フォルダ名を入力してください。'
  },
  zh:{
    settingsTitle:'Momoan Todo', startScreen:'重新查看开始指南', startScreenDesc:'查看基本操作、日历标记、例行任务和月度回顾。', open:'打开',
    currentStorage:'当前保存位置', currentStorageDesc:'当前连接的 Momoan Todo 数据位置。', connectStorage:'连接已有保存位置', connectStorageDesc:'连接已有的 Momoan Todo 数据文件夹，不移动文件。', connect:'连接', connectConfirm:'将此文件夹作为当前 Momoan Todo 保存位置吗？', connectStorageDone:'已连接到已有保存位置。', connectStorageInvalid:'未找到可识别的 Momoan Todo 数据。', storageFolder:'移动保存文件夹', storageFolderDesc:'将当前数据移动到新文件夹。', move:'移动', moveConfirm:'要将当前 Momoan Todo 数据移动到新文件夹吗？', recoverySnapshot:'手动恢复快照', recoverySnapshotDesc:'把一台电脑上的 Momoan Todo 数据和分类设置保存为一个快照，并在另一台电脑上完整恢复。', exportSnapshot:'导出快照', restoreLatestSnapshot:'恢复最新快照', snapshotExported:'恢复快照已保存到当前保存位置的 _Backups 文件夹。', snapshotMissing:'未找到恢复快照。', snapshotInvalid:'这不是有效的 Momoan Todo 恢复快照。', snapshotRestoreConfirm:'要用最新恢复快照替换当前 Momoan Todo 数据吗？恢复前状态会自动备份。', snapshotRestored:'恢复完成。重新加载一次 Obsidian 后，分类和数据将按快照状态应用。', snapshotBackupDone:'当前状态已保存为恢复前备份。', autoSafetyBackup:'自动安全备份', autoSafetyBackupDesc:'在删除或合并分类/分组前，自动保留最近5份恢复备份。', restoreAutoBackup:'恢复最新自动备份', autoBackupMissing:'未找到自动安全备份。', autoBackupRestoreConfirm:'要恢复最新的自动安全备份吗？当前状态也会先备份。', autoBackupRestored:'已恢复最新自动安全备份。请重新加载一次 Obsidian。',
    weekStart:'每周起始日', weekStartDesc:'日历与日期选择器的一周起始日。', monday:'星期一', sunday:'星期日',
    holidayRegion:'节假日地区', holidayRegionDesc:'按所选国家显示公共节假日。中国地区同时反映官方调休工作日。', holidayNone:'不显示', holidayKR:'韩国', holidayUS:'美国（联邦）', holidayJP:'日本', holidayCN:'中国',
    weekendColors:'周末颜色', weekendColorsDesc:'星期六显示为蓝色，星期日显示为红色。公共节假日会独立保持红色。',
    customHolidays:'额外节假日', customHolidaysDesc:'可添加临时节假日。用逗号分隔，名称可选。例如：2026-10-02=临时假日', customHolidayPlaceholder:'2026-10-02=临时假日, 2026-12-31', holidayGeneric:'节假日', adjustedWorkday:'调休工作日',
    accentColor:'强调色', accentColorDesc:'用于选择框和强调元素的颜色。', reset:'重置',
    monthlyReview:'月度回顾', monthlyReviewDesc:'在日历下方显示月度回顾区域。',
    monthCount:'月度任务数量', monthCountDesc:'在日历下方显示完成数/总数。',
    monthPercent:'月度完成率', monthPercentDesc:'在日历下方显示完成百分比。',
    hour24:'24小时制', hour24Desc:'以24小时制显示时间。关闭后使用12小时制。',
    language:'语言', languageDesc:'Momoan Todo 的界面语言。', korean:'한국어', english:'English', japanese:'日本語', chinese:'中文',
    displayBasis:'界面基准', displayBasisDesc:'以 Minimal 主题和 Pretendard 字体为基准进行设计。\n其他主题与字体也可使用，但间距与视觉效果可能不同。',
    todoList:'待办清单', today:'今天', completed:'完成', classification:'分类', addTask:'添加任务', routineManager:'例行任务', classificationSettings:'分类设置',
    noRemaining:'没有剩余任务', remaining:'剩余 {n} 项', emptyToday:'今天没有任务', emptyTodaySub:'需要时可以随时添加任务。',
    monthReview:'月度回顾', reviewWrite:'写回顾', imageSave:'保存图片', lastMonthChange:'较上月', focusCategory:'重点分类', focusGroup:'重点分组', categoryRecord:'分类记录', reviewJournal:'月度回顾记录', noReview:'尚未填写月度回顾。',
    prevMonth:'上个月', nextMonth:'下个月', chooseMonth:'选择年份和月份', remainingAria:'剩余 {n} 项任务', allDoneAria:'当天任务已全部完成。', previewAria:'有计划中的例行任务。',
    am:'上午', pm:'下午', percentDone:'完成 {n}%', moveStorageDone:'保存文件夹已移动。', moveStorageSame:'与当前保存文件夹相同。', moveStorageCollision:'目标位置已有同名数据。', invalidFolder:'请输入保存文件夹名称。'
  }
};

Object.assign(UI_TEXT.ko,{ title:'제목', category:'카테고리', group:'그룹', date:'날짜', time:'시간', details:'세부 설정', cancel:'취소', add:'추가', save:'저장', edit:'수정', delete:'삭제', active:'활성', addRoutine:'＋ 추가', noRoutines:'등록된 루틴이 없습니다.', firstRoutine:'＋ 첫 루틴 만들기', categoryTab:'카테고리', groupTab:'그룹', daily:'매일', weekdays:'평일', weekends:'주말', weekly:'매주', monthly:'매월', monthlyLast:'매월 마지막 날', yearly:'매년', repeat:'반복' });
Object.assign(UI_TEXT.en,{ title:'Title', category:'Category', group:'Group', date:'Date', time:'Time', details:'More options', cancel:'Cancel', add:'Add', save:'Save', edit:'Edit', delete:'Delete', active:'Active', addRoutine:'＋ Add', noRoutines:'No routines yet.', firstRoutine:'＋ Create first routine', categoryTab:'Categories', groupTab:'Groups', daily:'Daily', weekdays:'Weekdays', weekends:'Weekends', weekly:'Weekly', monthly:'Monthly', monthlyLast:'Last day of month', yearly:'Yearly', repeat:'Repeat' });
Object.assign(UI_TEXT.ja,{ title:'タイトル', category:'カテゴリ', group:'グループ', date:'日付', time:'時間', details:'詳細設定', cancel:'キャンセル', add:'追加', save:'保存', edit:'編集', delete:'削除', active:'有効', addRoutine:'＋ 追加', noRoutines:'登録されたルーティンはありません。', firstRoutine:'＋ 最初のルーティンを作成', categoryTab:'カテゴリ', groupTab:'グループ', daily:'毎日', weekdays:'平日', weekends:'週末', weekly:'毎週', monthly:'毎月', monthlyLast:'毎月末', yearly:'毎年', repeat:'繰り返し' });
Object.assign(UI_TEXT.zh,{ title:'标题', category:'分类', group:'分组', date:'日期', time:'时间', details:'详细设置', cancel:'取消', add:'添加', save:'保存', edit:'编辑', delete:'删除', active:'启用', addRoutine:'＋ 添加', noRoutines:'暂无例行任务。', firstRoutine:'＋ 创建第一个例行任务', categoryTab:'分类', groupTab:'分组', daily:'每天', weekdays:'工作日', weekends:'周末', weekly:'每周', monthly:'每月', monthlyLast:'每月最后一天', yearly:'每年', repeat:'重复' });

Object.assign(UI_TEXT.ko,{ name:'이름', location:'장소', optional:'선택 사항', newRoutine:'새 루틴', editRoutine:'루틴 수정', paused:'중지', weekday:'요일', month:'월', day:'일', cleanup:'정리', defaultLabel:'기본', restore:'다시 사용', inactive:'사용 중지', manage:'관리', newCategory:'새 카테고리', newGroup:'새 그룹', noGroups:'등록된 그룹이 없습니다.', chooseCategory:'카테고리를 선택해 주세요.', chooseGroup:'그룹을 선택해 주세요.', chooseMonthPrompt:'월을 선택해 주세요.', chooseDayPrompt:'일을 선택해 주세요.', chooseActive:'활성 상태를 선택해 주세요.', routineDelete:'루틴 삭제', titlePlaceholder:'예: 피부과 방문', routinePlaceholder:'예: 영양제 복용', enterTitle:'제목을 입력해 주세요.', enterRoutineName:'루틴 이름을 입력해 주세요.', weeklyNeedsDay:'매주 루틴은 요일을 하나 이상 선택해 주세요.', confirm:'확인', noDate:'날짜 없음', clearSelection:'선택 해제', chooseDate:'날짜 선택', hiddenTasks:'표시할 할 일이 없습니다', showCompleted:'완료 항목 보기' });
Object.assign(UI_TEXT.en,{ name:'Name', location:'Location', optional:'Optional', newRoutine:'New routine', editRoutine:'Edit routine', paused:'Paused', weekday:'Day', month:'Month', day:'Day', cleanup:'Organize', defaultLabel:'Default', restore:'Use again', inactive:'Inactive', manage:'Manage', newCategory:'New category', newGroup:'New group', noGroups:'No groups yet.', chooseCategory:'Choose a category', chooseGroup:'Choose a group', chooseMonthPrompt:'Choose a month', chooseDayPrompt:'Choose a day', chooseActive:'Choose status', routineDelete:'Delete routine', titlePlaceholder:'e.g. Dermatology appointment', routinePlaceholder:'e.g. Take supplements', enterTitle:'Enter a title.', enterRoutineName:'Enter a routine name.', weeklyNeedsDay:'Choose at least one day for a weekly routine.', confirm:'Confirm', noDate:'No date', clearSelection:'Clear', chooseDate:'Choose date', hiddenTasks:'No tasks to show', showCompleted:'Show completed' });
Object.assign(UI_TEXT.ja,{ name:'名前', location:'場所', optional:'任意', newRoutine:'新しいルーティン', editRoutine:'ルーティン編集', paused:'停止', weekday:'曜日', month:'月', day:'日', cleanup:'整理', defaultLabel:'基本', restore:'再開', inactive:'停止中', manage:'管理', newCategory:'新しいカテゴリ', newGroup:'新しいグループ', noGroups:'登録されたグループはありません。', chooseCategory:'カテゴリを選択', chooseGroup:'グループを選択', chooseMonthPrompt:'月を選択', chooseDayPrompt:'日を選択', chooseActive:'状態を選択', routineDelete:'ルーティン削除', titlePlaceholder:'例：皮膚科の予約', routinePlaceholder:'例：サプリを飲む', enterTitle:'タイトルを入力してください。', enterRoutineName:'ルーティン名を入力してください。', weeklyNeedsDay:'毎週のルーティンは曜日を1つ以上選択してください。', confirm:'確認', noDate:'日付なし', clearSelection:'選択解除', chooseDate:'日付を選択', hiddenTasks:'表示するタスクがありません', showCompleted:'完了項目を表示' });
Object.assign(UI_TEXT.zh,{ name:'名称', location:'地点', optional:'可选', newRoutine:'新建例行任务', editRoutine:'编辑例行任务', paused:'停用', weekday:'星期', month:'月', day:'日', cleanup:'整理', defaultLabel:'默认', restore:'重新启用', inactive:'已停用', manage:'管理', newCategory:'新分类', newGroup:'新分组', noGroups:'暂无分组。', chooseCategory:'选择分类', chooseGroup:'选择分组', chooseMonthPrompt:'选择月份', chooseDayPrompt:'选择日期', chooseActive:'选择状态', routineDelete:'删除例行任务', titlePlaceholder:'例如：皮肤科就诊', routinePlaceholder:'例如：服用营养补充剂', enterTitle:'请输入标题。', enterRoutineName:'请输入例行任务名称。', weeklyNeedsDay:'每周例行任务至少选择一天。', confirm:'确认', noDate:'无日期', clearSelection:'清除选择', chooseDate:'选择日期', hiddenTasks:'没有可显示的任务', showCompleted:'显示已完成' });

Object.assign(UI_TEXT.ko,{
  setupTitle:'Momoan Todo 시작하기', setupSub:'저장 위치와 템플릿을 정하면 바로 사용할 수 있습니다.', storageFolderLabel:'저장 폴더', storageFolderHelp:'데이터가 저장되는 Vault 내부 폴더를 입력하세요.', template:'템플릿', generatedCategories:'생성될 분류', start:'시작하기', guideOnly:'가이드 보기', setupPreviewNote:'이미 사용 중인 Vault입니다. 현재 데이터는 변경하지 않고 가이드만 열립니다.',
  presetDefault:'기본 구성', presetDefaultDesc:'업무/개인(일정/약속)/취미(독서/영화/음악)/생활(집안일/루틴)/기타', presetMinimal:'최소 구성', presetMinimalDesc:'업무/개인/기타', presetDirect:'직접 구성', presetDirectDesc:'기타',
  guideSkip:'건너뛰기', guideBack:'이전', guideNext:'다음', guideDone:'완료', guideStep:'{current}/{total}',
  guide1Title:'할 일을 빠르게 정리하세요', guide1Body:'날짜별 할 일을 추가하고 카테고리와 그룹으로 정리할 수 있습니다. 완료와 분류 표시는 메인 화면에서 바로 전환합니다.',
  guide2Title:'루틴은 필요한 범위만 생성합니다', guide2Body:'매일·평일·주말·매주는 오늘 포함 앞으로 7일만 실제 할 일을 만듭니다. 매월·월말은 7일 밖 회차를 미리보기로 두고, 매년은 앞으로 1년을 미리 보여준 뒤 7일 이내에 들어오면 실제 할 일로 전환합니다.',
  guide3Title:'캘린더와 월간 회고로 흐름을 봅니다', guide3Body:'캘린더에서 남은 할 일과 완료 상태를 확인하고, 월간 회고에서 집중 카테고리와 그룹을 정리할 수 있습니다.',
  guide4Title:'표시 방식은 설정에서 조정합니다', guide4Body:'주 시작 요일, 강조색, 월간 회고, 완료 개수·완료율, 시간 표시와 언어를 설정할 수 있습니다. 화면은 Minimal 테마와 Pretendard 폰트를 기준으로 다듬었습니다.',
  oneListNote:'Momoan Todo는 Vault마다 하나의 투두리스트를 사용합니다. 저장 위치 변경은 설정의 저장 폴더에서 이동하세요.', choosePeriod:'오전/오후 선택', chooseHour:'시 선택', chooseMinute:'분 선택'
});
Object.assign(UI_TEXT.en,{
  setupTitle:'Get started with Momoan Todo', setupSub:'Choose a storage location and template to finish setup.', storageFolderLabel:'Storage folder', storageFolderHelp:'Enter the Vault folder where your data will be stored.', template:'Template', generatedCategories:'Categories to create', start:'Start', guideOnly:'View guide', setupPreviewNote:'This Vault is already in use. Your current data will not be changed; only the guide will open.',
  presetDefault:'Default', presetDefaultDesc:'Work/Personal(Schedule/Appointments)/Hobbies(Reading/Movies/Music)/Life(Chores/Routines)/Other', presetMinimal:'Minimal', presetMinimalDesc:'Work/Personal/Other', presetDirect:'Custom', presetDirectDesc:'Other',
  guideSkip:'Skip', guideBack:'Back', guideNext:'Next', guideDone:'Done', guideStep:'{current}/{total}',
  guide1Title:'Organize tasks quickly', guide1Body:'Add tasks by date and organize them with categories and groups. Toggle completed tasks and classification directly from the main view.',
  guide2Title:'Routines generate only what you need', guide2Body:'Daily, weekday, weekend, and weekly routines create actual tasks for the next 7 days including today. Monthly routines stay as previews outside 7 days, and yearly routines preview the next 12 months before becoming actual tasks within 7 days.',
  guide3Title:'Review your month at a glance', guide3Body:'Use the calendar to see remaining and completed tasks, then use Monthly review to see your top categories and groups.',
  guide4Title:'Adjust display options in Settings', guide4Body:'Change the week start, accent color, monthly review, counts, completion rate, time format, and language. The UI is tuned for the Minimal theme and Pretendard font.',
  oneListNote:'Momoan Todo uses one active todo list per Vault. Move its storage folder from Settings instead of creating a second list.', choosePeriod:'Choose AM/PM', chooseHour:'Choose hour', chooseMinute:'Choose minute'
});
Object.assign(UI_TEXT.ja,{
  setupTitle:'Momoan Todo をはじめる', setupSub:'保存先とテンプレートを選んでセットアップを完了します。', storageFolderLabel:'保存フォルダ', storageFolderHelp:'データを保存する Vault 内フォルダを入力してください。', template:'テンプレート', generatedCategories:'作成される分類', start:'開始', guideOnly:'ガイドを見る', setupPreviewNote:'この Vault はすでに使用中です。現在のデータは変更せず、ガイドのみ開きます。',
  presetDefault:'基本構成', presetDefaultDesc:'仕事/個人(予定/約束)/趣味(読書/映画/音楽)/生活(家事/ルーティン)/その他', presetMinimal:'最小構成', presetMinimalDesc:'仕事/個人/その他', presetDirect:'直接構成', presetDirectDesc:'その他',
  guideSkip:'スキップ', guideBack:'戻る', guideNext:'次へ', guideDone:'完了', guideStep:'{current}/{total}',
  guide1Title:'タスクをすばやく整理', guide1Body:'日付ごとにタスクを追加し、カテゴリとグループで整理できます。完了表示と分類表示はメイン画面ですぐ切り替えられます。',
  guide2Title:'ルーティンは必要な範囲だけ生成', guide2Body:'毎日・平日・週末・毎週は今日を含む7日分だけ実タスクを作成します。毎月は7日より先をプレビューし、毎年は今後1年をプレビューして7日以内に入ると実タスクへ変わります。',
  guide3Title:'カレンダーと月間レビューで流れを確認', guide3Body:'カレンダーで残りタスクと完了状態を確認し、月間レビューで集中カテゴリとグループを振り返れます。',
  guide4Title:'表示方法は設定で調整', guide4Body:'週の開始曜日、アクセントカラー、月間レビュー、件数・完了率、時刻表示、言語を変更できます。Minimal テーマと Pretendard フォントを基準に調整しています。',
  oneListNote:'Momoan Todo は Vault ごとに1つのアクティブな Todo リストを使用します。保存先の変更は設定の保存フォルダから移動してください。', choosePeriod:'午前/午後を選択', chooseHour:'時を選択', chooseMinute:'分を選択'
});
Object.assign(UI_TEXT.zh,{
  setupTitle:'开始使用 Momoan Todo', setupSub:'选择保存位置和模板以完成设置。', storageFolderLabel:'保存文件夹', storageFolderHelp:'请输入用于保存数据的 Vault 内部文件夹。', template:'模板', generatedCategories:'将创建的分类', start:'开始', guideOnly:'查看指南', setupPreviewNote:'此 Vault 已在使用中。不会更改当前数据，只会打开指南。',
  presetDefault:'默认配置', presetDefaultDesc:'工作/个人(日程/约会)/兴趣(阅读/电影/音乐)/生活(家务/例行任务)/其他', presetMinimal:'精简配置', presetMinimalDesc:'工作/个人/其他', presetDirect:'自定义', presetDirectDesc:'其他',
  guideSkip:'跳过', guideBack:'上一步', guideNext:'下一步', guideDone:'完成', guideStep:'{current}/{total}',
  guide1Title:'快速整理任务', guide1Body:'按日期添加任务，并用分类和分组整理。可在主界面直接切换完成项与分类显示。',
  guide2Title:'例行任务只生成需要的范围', guide2Body:'每天、工作日、周末和每周仅生成包含今天在内未来7天的实际任务。每月任务在7天外显示预览，每年任务预览未来1年，并在进入7天范围后转为实际任务。',
  guide3Title:'用日历和月度回顾查看节奏', guide3Body:'在日历中查看剩余与完成状态，并在月度回顾中查看重点分类和分组。',
  guide4Title:'在设置中调整显示方式', guide4Body:'可调整每周起始日、强调色、月度回顾、任务数量与完成率、时间格式和语言。界面以 Minimal 主题和 Pretendard 字体为基准。',
  oneListNote:'Momoan Todo 每个 Vault 只使用一个活动待办清单。请在设置的保存文件夹中移动数据，而不是创建第二个清单。', choosePeriod:'选择上午/下午', chooseHour:'选择小时', chooseMinute:'选择分钟'
});


Object.assign(UI_TEXT.ko,{
  guideHeader:'시작 가이드',
  guideWelcomeTitle:'할 일 구조', guideWelcomeBody:'할 일은 카테고리 > 그룹 > 할 일 순서로 정리됩니다.\n큰 분류 안에 세부 그룹을 만들고, 그 아래에 할 일을 넣습니다.',
  guideControlsTitle:'메인 화면', guideControlsBody:'오른쪽 위에서 할 일 추가·루틴 관리·분류 설정을 엽니다.\n날짜 아래의 완료·분류 토글로 화면 표시를 바로 바꿀 수 있습니다.',
  guideAddTask:'할 일 추가', guideRoutine:'루틴 관리', guideClassify:'분류 설정', guideDoneToggle:'완료한 할 일 표시', guideClassifyToggle:'빈 분류까지 표시',
  guideRoutineTitle:'루틴 생성 범위', guideRoutineBody:'자주 반복되는 루틴은 앞으로 7일만 실제 할 일로 만듭니다.\n월간·연간 루틴은 먼저 Preview로 보이고, 가까워지면 실제 할 일이 됩니다.',
  guidePreviewTitle:'Preview', guidePreviewBody:'점(·)은 아직 체크할 수 없는 미래 루틴 일정입니다.\n해당 날짜가 7일 안으로 들어오면 실제 할 일로 바뀝니다.',
  guideCalendarTitle:'캘린더 표기', guideCalendarBody:'날짜 위의 작은 표시만 보면 그날 상태를 바로 알 수 있습니다.\n체크: 모두 완료; 숫자: 남은 할 일; 점: Preview; 빈칸: 없음', guideAllDone:'모두 완료', guideRemaining:'남은 할 일 3개', guidePreviewDot:'Preview', guideBlank:'할 일 없음',
  guideInteractionTitle:'할 일 관리', guideInteractionBody:'할 일 제목은 누르는 방식에 따라 동작이 달라집니다.\n한 번은 관리, 두 번은 이름 수정, 길게 누르기는 순서 변경입니다.',
  guideReviewTitle:'월간 회고', guideReviewBody:'한 달 동안 무엇에 집중했는지와 지난달 변화를 한눈에 봅니다.\n회고록을 직접 쓰거나, 현재 화면을 이미지로 저장할 수 있습니다.',
  guideCategoryLabel:'카테고리', guideGroupLabel:'그룹', guideTaskLabel:'할 일', guidePreviewState:'아직 체크할 수 없음',
  guideSingleClick:'한 번 클릭', guideSingleAction:'관리 메뉴', guideDoubleClick:'빠른 두 번 클릭', guideDoubleAction:'이름 수정', guideDrag:'길게 누르기', guideDragAction:'순서 변경',
  guideStartSetup:'시작하기', guideClose:'가이드 닫기', guideSevenDays:'오늘 포함 7일 → 실제 할 일', guideYearPreview:'미래는 Preview', guideToActual:'7일 안이면 실제 할 일'
});
Object.assign(UI_TEXT.en,{
  guideHeader:'Start guide', guideWelcomeTitle:'Task structure', guideWelcomeBody:'Tasks are organized as Category > Group > Task.\nCreate groups inside a broad category, then place tasks under them.',
  guideControlsTitle:'Main screen', guideControlsBody:'Use the top-right controls to add tasks, manage routines, and open Classification settings.\nUse the Done and Classification toggles below the date to change what is shown.',
  guideAddTask:'Add', guideRoutine:'Routines', guideClassify:'Categories', guideDoneToggle:'Show completed tasks', guideClassifyToggle:'Show empty classifications',
  guideCalendarTitle:'Calendar markers', guideCalendarBody:'The small marker above each date shows that day’s state.\nCheck: all done; Number: tasks left; Dot: Preview; Blank: none', guideAllDone:'All done', guideRemaining:'3 tasks left', guidePreviewDot:'Preview', guideBlank:'No tasks',
  guidePreviewTitle:'Preview', guidePreviewBody:'A dot (·) marks a future routine you cannot check yet.\nIt becomes an actual task when that date enters the next 7 days.',
  guideRoutineTitle:'Routine generation window', guideRoutineBody:'Frequent routines create actual tasks only for the next 7 days.\nMonthly and yearly routines appear as Preview first, then become actual tasks as they get close.',
  guideInteractionTitle:'Manage a task', guideInteractionBody:'The task title behaves differently depending on how you press it.\nClick once to manage, double-click to rename, and long-press to reorder.',
  guideReviewTitle:'Monthly review', guideReviewBody:'See what you focused on this month and how it changed from last month.\nWrite your review or save the current panel as an image.',
  guideCategoryLabel:'Category', guideGroupLabel:'Group', guideTaskLabel:'Task', guidePreviewState:'Not checkable yet', guideSingleAction:'Manage menu', guideDoubleAction:'Rename', guideDragAction:'Reorder',
  guideStartSetup:'Start setup', guideClose:'Close guide', guideSingleClick:'Click once', guideDoubleClick:'Double-click quickly', guideDrag:'Long-press', guideSevenDays:'Today + next 7 days → actual tasks', guideYearPreview:'Future → Preview', guideToActual:'Within 7 days → actual task'
});
Object.assign(UI_TEXT.ja,{
  guideHeader:'スタートガイド', guideWelcomeTitle:'タスクの構造', guideWelcomeBody:'タスクは カテゴリ > グループ > タスク の順で整理します。\n大きなカテゴリの中にグループを作り、その下にタスクを置きます。',
  guideControlsTitle:'メイン画面', guideControlsBody:'右上からタスク追加・ルーティン管理・分類設定を開きます。\n日付の下にある完了・分類トグルで表示をすぐ切り替えられます。',
  guideAddTask:'追加', guideRoutine:'ルーティン', guideClassify:'分類', guideDoneToggle:'完了タスクを表示', guideClassifyToggle:'空の分類も表示',
  guideCalendarTitle:'カレンダー表示', guideCalendarBody:'日付の上の小さな表示を見るだけで、その日の状態が分かります。\nチェック: 完了; 数字: 残り; 点: Preview; 空欄: なし', guideAllDone:'すべて完了', guideRemaining:'残り3件', guidePreviewDot:'Preview', guideBlank:'タスクなし',
  guidePreviewTitle:'Preview', guidePreviewBody:'点（·）はまだチェックできない未来のルーティン予定です。\nその日が7日以内に入ると実タスクになります。',
  guideRoutineTitle:'ルーティンの生成範囲', guideRoutineBody:'頻繁なルーティンは今後7日だけ実タスクを作ります。\n月間・年間ルーティンは先に Preview で表示され、近づくと実タスクになります。',
  guideInteractionTitle:'タスクの管理', guideInteractionBody:'タスク名は押し方によって動作が変わります。\n1回で管理、素早く2回で名前変更、長押しで並べ替えです。',
  guideReviewTitle:'月間レビュー', guideReviewBody:'1か月で何に集中したかと前月からの変化をひと目で確認します。\nレビューを書いたり、現在の画面を画像で保存できます。',
  guideCategoryLabel:'カテゴリ', guideGroupLabel:'グループ', guideTaskLabel:'タスク', guidePreviewState:'まだチェックできません', guideSingleAction:'管理メニュー', guideDoubleAction:'名前変更', guideDragAction:'並べ替え',
  guideStartSetup:'セットアップ開始', guideClose:'ガイドを閉じる', guideSingleClick:'1回クリック', guideDoubleClick:'素早く2回クリック', guideDrag:'長押し', guideSevenDays:'今日を含む7日 → 実タスク', guideYearPreview:'未来 → Preview', guideToActual:'7日以内 → 実タスク'
});
Object.assign(UI_TEXT.zh,{
  guideHeader:'开始指南', guideWelcomeTitle:'任务结构', guideWelcomeBody:'任务按 分类 > 分组 > 任务 的顺序整理。\n先在大分类中建立分组，再把任务放到分组下面。',
  guideControlsTitle:'主界面', guideControlsBody:'从右上角打开添加任务、例行任务管理和分类设置。\n用日期下方的完成与分类开关直接调整显示内容。',
  guideAddTask:'添加', guideRoutine:'例行', guideClassify:'分类', guideDoneToggle:'显示已完成任务', guideClassifyToggle:'显示空分类',
  guideCalendarTitle:'日历标记', guideCalendarBody:'只看日期上方的小标记，就能知道当天状态。\n勾选: 全部完成; 数字: 剩余任务; 点: Preview; 空白: 无', guideAllDone:'全部完成', guideRemaining:'剩余3项', guidePreviewDot:'Preview', guideBlank:'无任务',
  guidePreviewTitle:'Preview', guidePreviewBody:'点（·）表示暂时不能勾选的未来例行任务。\n当该日期进入未来7天时，会变成实际任务。',
  guideRoutineTitle:'例行任务生成范围', guideRoutineBody:'高频例行任务只生成未来7天的实际任务。\n月度和年度例行任务会先显示为 Preview，临近后转为实际任务。',
  guideInteractionTitle:'管理任务', guideInteractionBody:'任务标题会根据按下方式执行不同操作。\n单击管理、快速双击改名、长按排序。',
  guideReviewTitle:'月度回顾', guideReviewBody:'一眼查看本月主要投入的内容以及与上月的变化。\n可以填写回顾，也可以把当前面板保存为图片。',
  guideCategoryLabel:'分类', guideGroupLabel:'分组', guideTaskLabel:'任务', guidePreviewState:'暂时不能勾选', guideSingleAction:'管理菜单', guideDoubleAction:'改名', guideDragAction:'排序',
  guideStartSetup:'开始设置', guideClose:'关闭指南', guideSingleClick:'单击', guideDoubleClick:'快速双击', guideDrag:'长按', guideSevenDays:'含今天未来7天 → 实际任务', guideYearPreview:'未来 → Preview', guideToActual:'7天内 → 实际任务'
});


Object.assign(UI_TEXT.ko,{
  appearanceSettings:'외형 설정', appearanceSettingsDesc:'테마와 글꼴은 Obsidian 외형 설정에서 변경할 수 있습니다.', openAppearance:'외형 설정 열기',
  rename:'이름 변경', taskName:'할 일 이름', renameDone:'할 일 이름을 변경했습니다.',
  activeState:'활성', pausedState:'중지', cleanupTitle:'{name} 정리',
  mergeCategory:'다른 카테고리로 통합', mergeCategoryDesc:'선택한 카테고리로 기존 기록과 루틴을 옮깁니다.', disableFuture:'앞으로 사용하지 않기', disableFutureDesc:'기존 기록은 유지하고 새 할 일과 루틴에서 숨깁니다.', deleteAll:'전체 삭제', deleteAllDesc:'이 카테고리의 할 일 기록과 루틴을 모두 삭제합니다.', chooseMergeCategory:'통합할 카테고리를 선택해 주세요.',
  mergeGroup:'다른 그룹으로 통합', mergeGroupDesc:'선택한 그룹으로 기존 기록과 루틴을 옮깁니다.', mergeOther:'기타로 통합', mergeOtherDesc:'연결된 기록과 루틴을 기타 그룹으로 옮깁니다.', chooseMergeGroup:'통합할 그룹을 선택해 주세요.', noMergeGroup:'통합할 다른 그룹이 없습니다.',
  generatedCountDates:'{n}개 날짜에 생성', completionRate:'완료율', monthSummary:'이번 달 요약',
  guideRoutineWeekly:'주간 계열', guideRoutineWeeklyValue:'앞으로 7일 · 실제 할 일', guideRoutineLong:'월간 · 연간', guideRoutineLongValue:'미래는 Preview · 7일 안이면 실제 할 일', taskExample:'회의 자료 정리',
  currentStorageValue:'현재 연결 경로'
});
Object.assign(UI_TEXT.en,{
  appearanceSettings:'Appearance', appearanceSettingsDesc:'Change the theme and font in Obsidian Appearance settings.', openAppearance:'Open Appearance',
  rename:'Rename', taskName:'Task name', renameDone:'Task name updated.',
  activeState:'Active', pausedState:'Paused', cleanupTitle:'Manage {name}',
  mergeCategory:'Merge into another category', mergeCategoryDesc:'Move existing records and routines into the selected category.', disableFuture:'Stop using', disableFutureDesc:'Keep existing records and hide it from new tasks and routines.', deleteAll:'Delete all', deleteAllDesc:'Delete this category, its task records, and its routines.', chooseMergeCategory:'Choose a category to merge into.',
  mergeGroup:'Merge into another group', mergeGroupDesc:'Move existing records and routines into the selected group.', mergeOther:'Merge into Other', mergeOtherDesc:'Move linked records and routines into the Other group.', chooseMergeGroup:'Choose a group to merge into.', noMergeGroup:'No other group is available.',
  generatedCountDates:'Create on {n} dates', completionRate:'Completion rate', monthSummary:'Monthly summary',
  guideRoutineWeekly:'Weekly routines', guideRoutineWeeklyValue:'Next 7 days · actual tasks', guideRoutineLong:'Monthly · yearly', guideRoutineLongValue:'Future · Preview / within 7 days · actual', taskExample:'Prepare meeting notes',
  currentStorageValue:'Connected path'
});
Object.assign(UI_TEXT.ja,{
  appearanceSettings:'外観設定', appearanceSettingsDesc:'テーマとフォントは Obsidian の外観設定で変更できます。', openAppearance:'外観設定を開く',
  rename:'名前変更', taskName:'タスク名', renameDone:'タスク名を変更しました。',
  activeState:'有効', pausedState:'停止', cleanupTitle:'{name} を整理',
  mergeCategory:'別のカテゴリへ統合', mergeCategoryDesc:'既存記録とルーティンを選択したカテゴリへ移動します。', disableFuture:'今後使用しない', disableFutureDesc:'既存記録は残し、新しいタスクとルーティンでは非表示にします。', deleteAll:'すべて削除', deleteAllDesc:'このカテゴリのタスク記録とルーティンをすべて削除します。', chooseMergeCategory:'統合先のカテゴリを選択してください。',
  mergeGroup:'別のグループへ統合', mergeGroupDesc:'既存記録とルーティンを選択したグループへ移動します。', mergeOther:'「その他」へ統合', mergeOtherDesc:'関連記録とルーティンを「その他」グループへ移動します。', chooseMergeGroup:'統合先のグループを選択してください。', noMergeGroup:'統合できる別のグループがありません。',
  generatedCountDates:'{n}日分を作成', completionRate:'完了率', monthSummary:'今月の概要',
  guideRoutineWeekly:'週単位', guideRoutineWeeklyValue:'今後7日 · 実タスク', guideRoutineLong:'月間 · 年間', guideRoutineLongValue:'未来は Preview · 7日以内で実タスク', taskExample:'会議資料を整理',
  currentStorageValue:'接続中のパス'
});
Object.assign(UI_TEXT.zh,{
  appearanceSettings:'外观设置', appearanceSettingsDesc:'主题和字体可在 Obsidian 的外观设置中修改。', openAppearance:'打开外观设置',
  rename:'重命名', taskName:'任务名称', renameDone:'任务名称已更新。',
  activeState:'启用', pausedState:'停用', cleanupTitle:'整理 {name}',
  mergeCategory:'合并到其他分类', mergeCategoryDesc:'将现有记录和例行任务移动到所选分类。', disableFuture:'以后不再使用', disableFutureDesc:'保留现有记录，并在新任务和例行任务中隐藏。', deleteAll:'全部删除', deleteAllDesc:'删除该分类的任务记录和例行任务。', chooseMergeCategory:'请选择要合并到的分类。',
  mergeGroup:'合并到其他分组', mergeGroupDesc:'将现有记录和例行任务移动到所选分组。', mergeOther:'合并到“其他”', mergeOtherDesc:'将相关记录和例行任务移动到“其他”分组。', chooseMergeGroup:'请选择要合并到的分组。', noMergeGroup:'没有可合并的其他分组。',
  generatedCountDates:'在 {n} 个日期创建', completionRate:'完成率', monthSummary:'本月概要',
  guideRoutineWeekly:'周类例行任务', guideRoutineWeeklyValue:'未来7天 · 实际任务', guideRoutineLong:'月度 · 年度', guideRoutineLongValue:'未来为 Preview · 7天内转为实际任务', taskExample:'整理会议资料',
  currentStorageValue:'当前连接路径'
});


Object.assign(UI_TEXT.ko,{ routineDeletePrompt:'{name} · 삭제 범위를 선택해 주세요.', deleteRoutineAll:'모든 할 일 삭제', deleteRoutineAllDesc:'완료·미완료를 포함해 이미 생성된 할 일을 삭제합니다.', deleteRoutineIncomplete:'미완료 할 일 삭제', deleteRoutineIncompleteDesc:'완료 기록은 남기고 생성된 미완료 할 일만 삭제합니다.', deleteRoutineFuture:'미생성 할 일 삭제', deleteRoutineFutureDesc:'이미 생성된 할 일은 그대로 둡니다.', routineDeletedAll:'루틴과 생성된 모든 할 일을 삭제했습니다.', routineDeletedIncomplete:'루틴과 미완료 할 일을 삭제했습니다. 완료 기록은 유지됩니다.', routineDeletedFuture:'루틴만 삭제했습니다. 이미 생성된 할 일은 유지됩니다.' });
Object.assign(UI_TEXT.en,{ routineDeletePrompt:'{name} · Choose what to remove.', deleteRoutineAll:'Delete all generated tasks', deleteRoutineAllDesc:'Delete all generated tasks from this routine, completed or not.', deleteRoutineIncomplete:'Delete incomplete tasks', deleteRoutineIncompleteDesc:'Keep completed records and delete generated incomplete tasks.', deleteRoutineFuture:'Delete routine only', deleteRoutineFutureDesc:'Keep tasks that have already been generated.', routineDeletedAll:'Routine and all generated tasks deleted.', routineDeletedIncomplete:'Routine and incomplete tasks deleted. Completed records were kept.', routineDeletedFuture:'Routine deleted. Generated tasks were kept.' });
Object.assign(UI_TEXT.ja,{ routineDeletePrompt:'{name} · 削除範囲を選択してください。', deleteRoutineAll:'生成済みタスクをすべて削除', deleteRoutineAllDesc:'完了・未完了を含め、このルーティンから生成済みのタスクを削除します。', deleteRoutineIncomplete:'未完了タスクを削除', deleteRoutineIncompleteDesc:'完了記録は残し、生成済みの未完了タスクだけ削除します。', deleteRoutineFuture:'ルーティンのみ削除', deleteRoutineFutureDesc:'すでに生成されたタスクはそのまま残します。', routineDeletedAll:'ルーティンと生成済みタスクをすべて削除しました。', routineDeletedIncomplete:'ルーティンと未完了タスクを削除しました。完了記録は保持されます。', routineDeletedFuture:'ルーティンを削除しました。生成済みタスクは保持されます。' });
Object.assign(UI_TEXT.zh,{ routineDeletePrompt:'{name} · 请选择删除范围。', deleteRoutineAll:'删除所有已生成任务', deleteRoutineAllDesc:'删除该例行任务已生成的全部任务，包括已完成和未完成。', deleteRoutineIncomplete:'删除未完成任务', deleteRoutineIncompleteDesc:'保留已完成记录，仅删除已生成的未完成任务。', deleteRoutineFuture:'仅删除例行任务', deleteRoutineFutureDesc:'已经生成的任务保持不变。', routineDeletedAll:'已删除例行任务及所有已生成任务。', routineDeletedIncomplete:'已删除例行任务和未完成任务，已完成记录已保留。', routineDeletedFuture:'已删除例行任务，已生成任务已保留。' });


Object.assign(UI_TEXT.ko,{ editTask:'수정', editDaily:'일일 수정', changeDate:'날짜 이동', moveTodayQuick:'금일 이동', moveTomorrowQuick:'명일 이동', copyTask:'복사 생성', deleteDaily:'일일 삭제', moveToday:'오늘로 당기기', skipOccurrence:'이번 회차 건너뛰기', routineEdit:'루틴 수정', noRoutineSource:'연결된 루틴 원본을 찾지 못했습니다.', deleteTaskAction:'삭제', taskLocation:'장소', enterName:'이름을 입력해 주세요.', autoSort:'자동 정렬', autoSortHint:'시간 우선 · 짧은 제목 순', autoSorted:'이 날짜의 할 일을 자동 정렬했습니다.', autoSortNoChange:'이미 정렬된 순서입니다.' });
Object.assign(UI_TEXT.en,{ editTask:'Edit', editDaily:'Edit this occurrence', changeDate:'Move date', moveTodayQuick:'Move to today', moveTomorrowQuick:'Move to tomorrow', copyTask:'Duplicate', deleteDaily:'Delete this occurrence', moveToday:'Move to today', skipOccurrence:'Skip this occurrence', routineEdit:'Edit routine', noRoutineSource:'The linked routine could not be found.', deleteTaskAction:'Delete', taskLocation:'Location', enterName:'Enter a name.', autoSort:'Auto sort', autoSortHint:'Time first · shorter titles first', autoSorted:'Sorted tasks for this date.', autoSortNoChange:'Tasks are already sorted.' });
Object.assign(UI_TEXT.ja,{ editTask:'編集', editDaily:'この回だけ編集', changeDate:'日付移動', moveTodayQuick:'今日へ移動', moveTomorrowQuick:'明日へ移動', copyTask:'複製', deleteDaily:'この回だけ削除', moveToday:'今日へ移動', skipOccurrence:'この回をスキップ', routineEdit:'ルーティン編集', noRoutineSource:'リンクされたルーティンが見つかりません。', deleteTaskAction:'削除', taskLocation:'場所', enterName:'名前を入力してください。', autoSort:'自動整列', autoSortHint:'時刻優先 · 短いタイトル順', autoSorted:'この日のタスクを自動整列しました。', autoSortNoChange:'すでに整列済みです。' });
Object.assign(UI_TEXT.zh,{ editTask:'编辑', editDaily:'仅编辑本次', changeDate:'移动日期', moveTodayQuick:'移至今天', moveTomorrowQuick:'移至明天', copyTask:'复制', deleteDaily:'仅删除本次', moveToday:'移到今天', skipOccurrence:'跳过本次', routineEdit:'编辑例行任务', noRoutineSource:'找不到关联的例行任务。', deleteTaskAction:'删除', taskLocation:'地点', enterName:'请输入名称。', autoSort:'自动排序', autoSortHint:'有时间优先 · 标题短的优先', autoSorted:'已自动排序当天任务。', autoSortNoChange:'当前顺序已符合规则。' });

Object.assign(UI_TEXT.ko,{
  autoSortSettings:'자동 정렬', autoSortSettingsDesc:'상단 정렬 버튼을 눌렀을 때 현재 날짜의 각 그룹 내부에서만 적용됩니다.',
  autoSortPreset:'정렬 프리셋', autoSortPresetDesc:'자주 쓰는 기준 조합을 빠르게 선택합니다.', sortPresetQuick:'빠른 처리', sortPresetTime:'시간 중심', sortPresetManual:'수동 중심', sortPresetCustom:'사용자 지정',
  autoSortPriority1:'정렬 1순위', autoSortPriority2:'정렬 2순위', autoSortPriority3:'정렬 3순위', autoSortPriorityDesc:'앞 순위가 같을 때 다음 순위를 적용합니다.',
  sortCriterionTime:'시간', sortCriterionTitleLength:'제목 길이', sortCriterionAlphabet:'가나다순', sortCriterionManual:'현재 수동 순서',
  autoSortTimedPlacement:'시간 있는 할 일', autoSortTimedPlacementDesc:'시간 기준을 사용할 때 시간 있는 항목의 위치입니다.', sortTimedFirst:'위로', sortTimedLast:'아래로',
  autoSortCompletedPlacement:'완료한 할 일', autoSortCompletedPlacementDesc:'완료 항목을 별도로 아래로 보낼지 선택합니다.', sortCompletedMixed:'그대로 정렬', sortCompletedBottom:'맨 아래',
  autoSortRoutinePlacement:'루틴', autoSortRoutinePlacementDesc:'일반 할 일과 루틴 회차의 우선 배치를 정합니다.', sortRoutineMixed:'구분하지 않음', sortGeneralFirst:'일반 할 일 우선', sortRoutineFirst:'루틴 우선',
  autoSortReset:'기본값으로 되돌리기', autoSortHintConfigured:'설정의 자동 정렬 기준으로 현재 날짜를 정렬합니다.'
});
Object.assign(UI_TEXT.en,{
  autoSortSettings:'Auto sort', autoSortSettingsDesc:'Applied only within each group on the current date when you press the Sort button.',
  autoSortPreset:'Sort preset', autoSortPresetDesc:'Choose a useful combination of sorting rules.', sortPresetQuick:'Quick wins', sortPresetTime:'Time focused', sortPresetManual:'Manual focused', sortPresetCustom:'Custom',
  autoSortPriority1:'Sort priority 1', autoSortPriority2:'Sort priority 2', autoSortPriority3:'Sort priority 3', autoSortPriorityDesc:'The next priority is used when the previous one is tied.',
  sortCriterionTime:'Time', sortCriterionTitleLength:'Title length', sortCriterionAlphabet:'Alphabetical', sortCriterionManual:'Current manual order',
  autoSortTimedPlacement:'Tasks with time', autoSortTimedPlacementDesc:'Where timed tasks go when Time is used as a criterion.', sortTimedFirst:'First', sortTimedLast:'Last',
  autoSortCompletedPlacement:'Completed tasks', autoSortCompletedPlacementDesc:'Optionally keep completed tasks at the bottom.', sortCompletedMixed:'Sort normally', sortCompletedBottom:'Bottom',
  autoSortRoutinePlacement:'Routines', autoSortRoutinePlacementDesc:'Choose whether regular tasks or routine occurrences come first.', sortRoutineMixed:'Do not separate', sortGeneralFirst:'Regular tasks first', sortRoutineFirst:'Routines first',
  autoSortReset:'Reset to default', autoSortHintConfigured:'Sort the current date using the rules in Settings.'
});
Object.assign(UI_TEXT.ja,{
  autoSortSettings:'自動整列', autoSortSettingsDesc:'上部の整列ボタンを押したとき、現在日の各グループ内だけに適用します。',
  autoSortPreset:'整列プリセット', autoSortPresetDesc:'よく使う基準の組み合わせを選びます。', sortPresetQuick:'すばやく処理', sortPresetTime:'時間中心', sortPresetManual:'手動中心', sortPresetCustom:'カスタム',
  autoSortPriority1:'整列 1順位', autoSortPriority2:'整列 2順位', autoSortPriority3:'整列 3順位', autoSortPriorityDesc:'前の順位が同じ場合に次の順位を使います。',
  sortCriterionTime:'時間', sortCriterionTitleLength:'タイトルの長さ', sortCriterionAlphabet:'五十音・文字順', sortCriterionManual:'現在の手動順',
  autoSortTimedPlacement:'時間ありタスク', autoSortTimedPlacementDesc:'時間基準を使うときの時間ありタスクの位置です。', sortTimedFirst:'上', sortTimedLast:'下',
  autoSortCompletedPlacement:'完了タスク', autoSortCompletedPlacementDesc:'完了タスクを下へまとめるか選びます。', sortCompletedMixed:'そのまま整列', sortCompletedBottom:'一番下',
  autoSortRoutinePlacement:'ルーティン', autoSortRoutinePlacementDesc:'通常タスクとルーティンの優先配置を選びます。', sortRoutineMixed:'区別しない', sortGeneralFirst:'通常タスク優先', sortRoutineFirst:'ルーティン優先',
  autoSortReset:'初期値に戻す', autoSortHintConfigured:'設定した基準で現在日を整列します。'
});
Object.assign(UI_TEXT.zh,{
  autoSortSettings:'自动排序', autoSortSettingsDesc:'点击顶部排序按钮时，只在当前日期的各分组内部应用。',
  autoSortPreset:'排序预设', autoSortPresetDesc:'快速选择常用的排序规则组合。', sortPresetQuick:'快速处理', sortPresetTime:'时间优先', sortPresetManual:'手动优先', sortPresetCustom:'自定义',
  autoSortPriority1:'排序优先级 1', autoSortPriority2:'排序优先级 2', autoSortPriority3:'排序优先级 3', autoSortPriorityDesc:'上一优先级相同时再应用下一项。',
  sortCriterionTime:'时间', sortCriterionTitleLength:'标题长度', sortCriterionAlphabet:'文字顺序', sortCriterionManual:'当前手动顺序',
  autoSortTimedPlacement:'有时间的任务', autoSortTimedPlacementDesc:'使用时间排序时，有时间任务放置的位置。', sortTimedFirst:'上方', sortTimedLast:'下方',
  autoSortCompletedPlacement:'已完成任务', autoSortCompletedPlacementDesc:'选择是否将已完成任务统一放到底部。', sortCompletedMixed:'正常排序', sortCompletedBottom:'最下方',
  autoSortRoutinePlacement:'例行任务', autoSortRoutinePlacementDesc:'设置普通任务和例行任务的优先位置。', sortRoutineMixed:'不区分', sortGeneralFirst:'普通任务优先', sortRoutineFirst:'例行任务优先',
  autoSortReset:'恢复默认', autoSortHintConfigured:'按照设置中的规则排序当前日期。'
});

Object.assign(UI_TEXT.ko,{
  settingsSectionGeneral:'화면·기본', settingsSectionGeneralDesc:'자주 쓰는 화면과 표시 설정입니다.',
  settingsSectionCalendar:'캘린더·회고', settingsSectionCalendarDesc:'달력, 공휴일, 월간 회고 표시를 조정합니다.',
  settingsSectionStorage:'저장소', settingsSectionStorageDesc:'데이터 저장 위치를 연결하거나 이동합니다. 평소에는 열 필요가 없습니다.',
  settingsSectionRecovery:'백업·복구', settingsSectionRecoveryDesc:'문제가 생겼을 때만 사용하는 안전 장치입니다. 수동·자동 백업은 현재 저장소의 _Backups 폴더에 보관됩니다.'
});
Object.assign(UI_TEXT.en,{
  settingsSectionGeneral:'Display & basics', settingsSectionGeneralDesc:'Common display and interface options.',
  settingsSectionCalendar:'Calendar & review', settingsSectionCalendarDesc:'Calendar, holidays, and monthly review display.',
  settingsSectionStorage:'Storage', settingsSectionStorageDesc:'Connect or move the data folder. Usually you do not need to open this section.',
  settingsSectionRecovery:'Backup & recovery', settingsSectionRecoveryDesc:'Safety tools for troubleshooting. Manual and automatic backups are stored in the _Backups folder under the current storage.'
});
Object.assign(UI_TEXT.ja,{
  settingsSectionGeneral:'表示・基本', settingsSectionGeneralDesc:'よく使う表示とインターフェース設定です。',
  settingsSectionCalendar:'カレンダー・レビュー', settingsSectionCalendarDesc:'カレンダー、祝日、月間レビュー表示を調整します。',
  settingsSectionStorage:'保存先', settingsSectionStorageDesc:'データ保存先の接続・移動を行います。通常は開く必要はありません。',
  settingsSectionRecovery:'バックアップ・復元', settingsSectionRecoveryDesc:'問題が起きたときに使う安全機能です。手動・自動バックアップは現在の保存先の _Backups フォルダに保存されます。'
});
Object.assign(UI_TEXT.zh,{
  settingsSectionGeneral:'显示与基础', settingsSectionGeneralDesc:'常用的显示和界面设置。',
  settingsSectionCalendar:'日历与回顾', settingsSectionCalendarDesc:'调整日历、节假日和月度回顾显示。',
  settingsSectionStorage:'保存位置', settingsSectionStorageDesc:'连接或移动数据文件夹。通常无需打开此区域。',
  settingsSectionRecovery:'备份与恢复', settingsSectionRecoveryDesc:'仅在出现问题时使用的安全工具。手动和自动备份会保存在当前保存位置的 _Backups 文件夹中。'
});

// v0.9.51 — compact settings copy
Object.assign(UI_TEXT.ko,{
  settingsSectionGeneralDesc:'화면과 기본 표시 설정.',
  settingsSectionCalendarDesc:'달력·공휴일·월간 회고 설정.',
  autoSortSettingsDesc:'상단 정렬 버튼의 기준을 설정합니다.',
  settingsSectionStorageDesc:'저장 위치를 연결·이동합니다.',
  settingsSectionRecoveryDesc:'복구용 백업 관리. 파일은 _Backups에 저장됩니다.',
  displayBasisDesc:'Minimal 테마·Pretendard 기준.',
  startScreenDesc:'기본 사용법을 다시 확인합니다.',
  accentColorDesc:'선택선과 강조 요소 색상.',
  hour24Desc:'시간을 24시간제로 표시합니다.',
  languageDesc:'인터페이스 언어.',
  weekStartDesc:'캘린더 시작 요일.',
  holidayRegionDesc:'공휴일 표시 국가.',
  weekendColorsDesc:'토요일 파랑 · 일요일 빨강.',
  customHolidaysDesc:'YYYY-MM-DD[=이름] 형식, 쉼표로 구분.',
  monthlyReviewDesc:'캘린더 아래 회고 영역.',
  monthCountDesc:'완료/전체 개수 표시.',
  monthPercentDesc:'완료율 표시.',
  autoSortPresetDesc:'정렬 기준 조합을 선택합니다.',
  autoSortTimedPlacementDesc:'시간 있는 항목의 위치.',
  autoSortCompletedPlacementDesc:'완료 항목을 아래로 보낼지 선택.',
  autoSortRoutinePlacementDesc:'일반 할 일과 루틴의 우선순위.',
  connectStorageDesc:'기존 데이터 폴더를 연결합니다.',
  storageFolderDesc:'현재 데이터를 다른 폴더로 옮깁니다.',
  recoverySnapshotDesc:'현재 데이터와 분류를 _Backups에 저장합니다.',
  autoSafetyBackupDesc:'분류 삭제·병합 전에 최근 5개를 자동 보관합니다.'
});
Object.assign(UI_TEXT.en,{
  settingsSectionGeneralDesc:'Display and basic options.',
  settingsSectionCalendarDesc:'Calendar, holidays, and monthly review.',
  autoSortSettingsDesc:'Set the rules used by the Sort button.',
  settingsSectionStorageDesc:'Connect or move the data folder.',
  settingsSectionRecoveryDesc:'Recovery backups stored in _Backups.',
  displayBasisDesc:'Designed for Minimal + Pretendard.', startScreenDesc:'Review the basic guide.', accentColorDesc:'Selection and accent color.', hour24Desc:'Use 24-hour time.', languageDesc:'Interface language.',
  weekStartDesc:'Calendar week start.', holidayRegionDesc:'Holiday region.', weekendColorsDesc:'Saturday blue · Sunday red.', customHolidaysDesc:'YYYY-MM-DD[=name], comma-separated.', monthlyReviewDesc:'Monthly review below the calendar.', monthCountDesc:'Show completed/total count.', monthPercentDesc:'Show completion rate.',
  autoSortPresetDesc:'Choose a sorting preset.', autoSortTimedPlacementDesc:'Position of timed tasks.', autoSortCompletedPlacementDesc:'Optionally move completed tasks down.', autoSortRoutinePlacementDesc:'Priority between tasks and routines.',
  connectStorageDesc:'Connect an existing data folder.', storageFolderDesc:'Move current data to another folder.', recoverySnapshotDesc:'Save current data and taxonomy to _Backups.', autoSafetyBackupDesc:'Keep the latest 5 backups before taxonomy delete/merge.'
});
Object.assign(UI_TEXT.ja,{
  settingsSectionGeneralDesc:'画面と基本表示の設定。', settingsSectionCalendarDesc:'カレンダー・祝日・月間レビュー。', autoSortSettingsDesc:'整列ボタンの基準を設定します。', settingsSectionStorageDesc:'保存先の接続・移動。', settingsSectionRecoveryDesc:'復元用バックアップ。_Backups に保存されます。',
  displayBasisDesc:'Minimal・Pretendard 基準。', startScreenDesc:'基本ガイドを再確認します。', accentColorDesc:'選択・強調色。', hour24Desc:'24時間表記を使います。', languageDesc:'インターフェース言語。',
  weekStartDesc:'週の開始曜日。', holidayRegionDesc:'祝日を表示する国。', weekendColorsDesc:'土曜は青・日曜は赤。', customHolidaysDesc:'YYYY-MM-DD[=名前]、カンマ区切り。', monthlyReviewDesc:'カレンダー下の月間レビュー。', monthCountDesc:'完了/全体数を表示。', monthPercentDesc:'完了率を表示。',
  autoSortPresetDesc:'整列プリセットを選択。', autoSortTimedPlacementDesc:'時間あり項目の位置。', autoSortCompletedPlacementDesc:'完了項目を下へ送るか選択。', autoSortRoutinePlacementDesc:'通常タスクとルーティンの優先順。',
  connectStorageDesc:'既存データフォルダに接続。', storageFolderDesc:'現在のデータを別フォルダへ移動。', recoverySnapshotDesc:'現在のデータと分類を _Backups に保存。', autoSafetyBackupDesc:'分類の削除・統合前に最新5件を自動保存。'
});
Object.assign(UI_TEXT.zh,{
  settingsSectionGeneralDesc:'界面与基础显示设置。', settingsSectionCalendarDesc:'日历、节假日与月度回顾。', autoSortSettingsDesc:'设置顶部排序按钮的规则。', settingsSectionStorageDesc:'连接或移动数据位置。', settingsSectionRecoveryDesc:'恢复备份，保存在 _Backups。',
  displayBasisDesc:'以 Minimal 与 Pretendard 为基准。', startScreenDesc:'重新查看基础指南。', accentColorDesc:'选择与强调色。', hour24Desc:'使用24小时制。', languageDesc:'界面语言。',
  weekStartDesc:'一周开始日。', holidayRegionDesc:'节假日地区。', weekendColorsDesc:'周六蓝色 · 周日红色。', customHolidaysDesc:'YYYY-MM-DD[=名称]，逗号分隔。', monthlyReviewDesc:'日历下方的月度回顾。', monthCountDesc:'显示完成/总数。', monthPercentDesc:'显示完成率。',
  autoSortPresetDesc:'选择排序预设。', autoSortTimedPlacementDesc:'有时间任务的位置。', autoSortCompletedPlacementDesc:'是否将完成项移到底部。', autoSortRoutinePlacementDesc:'普通任务与例行任务的优先顺序。',
  connectStorageDesc:'连接已有数据文件夹。', storageFolderDesc:'将当前数据移动到其他文件夹。', recoverySnapshotDesc:'将当前数据与分类保存到 _Backups。', autoSafetyBackupDesc:'分类删除或合并前自动保留最近5份备份。'
});



Object.assign(UI_TEXT.ko,{
  addTaskFailed:'할 일 추가에 실패했습니다.', taskAdded:'할 일을 추가했습니다.', duplicateCategory:'이미 같은 카테고리가 있습니다.', duplicateGroup:'이미 같은 그룹이 있습니다.', moveUp:'{name} 위로', moveDown:'{name} 아래로', categoryDisabled:'{name} 카테고리를 사용 중지했습니다.', groupDisabled:'{name} 그룹을 사용 중지했습니다.', categoryDeleted:'{name} 카테고리와 연결된 할 일·루틴을 모두 삭제했습니다.', categoryMerged:'{from} 카테고리를 {to}(으)로 통합했습니다.', groupMerged:'{from} 그룹을 {to}(으)로 통합했습니다.', renamedTo:'{from} → {to}로 변경했습니다.', routineSaved:'{name} 루틴을 {mode}했습니다.', routineAddedWord:'추가', routineEditedWord:'수정', routineDeleteFailed:'루틴 삭제 실패 · {error}', routineTaxonomyNormalized:'기존 루틴 할 일 {n}개를 현재 분류 기준으로 정리했습니다.', routineRecalculated:'오늘 이후 루틴 일정과 preview를 현재 규칙으로 다시 계산했습니다.', groupHidden:'{category} · {group} 그룹을 선택 목록에서 숨겼습니다.', groupHideFailed:'그룹 숨기기에 실패했습니다.', none:'없음', monthReviewNotFound:'저장할 월간 회고 화면을 찾지 못했습니다.', monthReviewImageFailed:'이미지 저장에 실패했습니다. 콘솔을 확인해 주세요.', prevYear:'이전 해', nextYear:'다음 해', go:'이동', toggleCompletedAria:'완료한 할 일 표시 전환', toggleClassificationAria:'카테고리와 그룹 전체 표시 전환', addTaskFor:'{name} 할 일 추가', addTaskForGroup:'{category} · {group} 할 일 추가', undoComplete:'완료 취소', previewRoutine:'예정된 루틴', skippedOccurrence:'이번 회차 건너뜀', canRestore:'다시 추가 가능', menuFor:'{name} 메뉴', previewMenuFor:'{name} 예정 메뉴', ghostMenuFor:'{name} 잔상 메뉴', restoreHint:'클릭하면 다시 추가됩니다.', duplicateRoutineDate:'이 날짜에 같은 루틴이 이미 있습니다.', restoredTask:'{name}을(를) 다시 추가했습니다.', removeGhostConfirm:'"{name}" 잔상을 완전히 제거하시겠습니까?', removedGhost:'{name} 잔상을 완전히 제거했습니다.', movedToday:'{name}을(를) 오늘로 당겼습니다.', skippedTask:'{name}의 이번 회차를 건너뜁니다.', movedDate:'{name}을(를) {date}로 옮겼습니다.', copiedDates:'{name}을(를) {n}개 날짜에 복사 생성했습니다.', deleteOccurrenceConfirm:'"{name}"을(를) 오늘 목록에서 삭제하시겠습니까?\n루틴 전체는 유지됩니다.', deleteTaskConfirm:'"{name}"을(를) 삭제하시겠습니까?', deletedTask:'{name}을(를) 삭제했습니다.', occurrenceUpdated:'이번 할 일을 수정했습니다.', taskUpdated:'할 일을 수정했습니다.'
});
Object.assign(UI_TEXT.en,{
  addTaskFailed:'Failed to add task.', taskAdded:'Task added.', duplicateCategory:'A category with the same name already exists.', duplicateGroup:'A group with the same name already exists.', moveUp:'Move {name} up', moveDown:'Move {name} down', categoryDisabled:'Stopped using category {name}.', groupDisabled:'Stopped using group {name}.', categoryDeleted:'Deleted category {name} and its linked tasks and routines.', categoryMerged:'Merged category {from} into {to}.', groupMerged:'Merged group {from} into {to}.', renamedTo:'Changed {from} → {to}.', routineSaved:'Routine {name} {mode}.', routineAddedWord:'added', routineEditedWord:'updated', routineDeleteFailed:'Failed to delete routine · {error}', routineTaxonomyNormalized:'Updated {n} routine tasks to the current classification.', routineRecalculated:'Recalculated routine tasks and previews from today onward.', groupHidden:'Hid {category} · {group} from group choices.', groupHideFailed:'Failed to hide group.', none:'None', monthReviewNotFound:'Could not find the monthly review view to save.', monthReviewImageFailed:'Failed to save image. Check the console.', prevYear:'Previous year', nextYear:'Next year', go:'Go', toggleCompletedAria:'Toggle completed tasks', toggleClassificationAria:'Toggle all categories and groups', addTaskFor:'Add task to {name}', addTaskForGroup:'Add task to {category} · {group}', undoComplete:'Mark incomplete', previewRoutine:'Scheduled routine', skippedOccurrence:'Skipped occurrence', canRestore:'Can restore', menuFor:'Menu for {name}', previewMenuFor:'Scheduled menu for {name}', ghostMenuFor:'Residual item menu for {name}', restoreHint:'Click to restore.', duplicateRoutineDate:'This routine already exists on this date.', restoredTask:'Restored {name}.', removeGhostConfirm:'Remove the residual item "{name}" permanently?', removedGhost:'Removed residual item {name}.', movedToday:'Moved {name} to today.', skippedTask:'Skipped this occurrence of {name}.', movedDate:'Moved {name} to {date}.', copiedDates:'Duplicated {name} to {n} dates.', deleteOccurrenceConfirm:'Delete "{name}" from today?\nThe routine itself will remain.', deleteTaskConfirm:'Delete "{name}"?', deletedTask:'Deleted {name}.', occurrenceUpdated:'Updated this occurrence.', taskUpdated:'Task updated.'
});
Object.assign(UI_TEXT.ja,{
  addTaskFailed:'タスクの追加に失敗しました。', taskAdded:'タスクを追加しました。', duplicateCategory:'同じ名前のカテゴリがあります。', duplicateGroup:'同じ名前のグループがあります。', moveUp:'{name} を上へ', moveDown:'{name} を下へ', categoryDisabled:'カテゴリ「{name}」を今後使用しない設定にしました。', groupDisabled:'グループ「{name}」を今後使用しない設定にしました。', categoryDeleted:'カテゴリ「{name}」と関連するタスク・ルーティンを削除しました。', categoryMerged:'カテゴリ「{from}」を「{to}」へ統合しました。', groupMerged:'グループ「{from}」を「{to}」へ統合しました。', renamedTo:'{from} → {to} に変更しました。', routineSaved:'ルーティン「{name}」を{mode}しました。', routineAddedWord:'追加', routineEditedWord:'更新', routineDeleteFailed:'ルーティンの削除に失敗 · {error}', routineTaxonomyNormalized:'既存ルーティンタスク {n}件を現在の分類に整理しました。', routineRecalculated:'今日以降のルーティン予定と Preview を現在のルールで再計算しました。', groupHidden:'{category} · {group} を選択リストから非表示にしました。', groupHideFailed:'グループの非表示に失敗しました。', none:'なし', monthReviewNotFound:'保存する月間レビュー画面が見つかりません。', monthReviewImageFailed:'画像の保存に失敗しました。コンソールを確認してください。', prevYear:'前年', nextYear:'翌年', go:'移動', toggleCompletedAria:'完了タスク表示を切り替え', toggleClassificationAria:'カテゴリとグループの全表示を切り替え', addTaskFor:'{name} にタスクを追加', addTaskForGroup:'{category} · {group} にタスクを追加', undoComplete:'未完了に戻す', previewRoutine:'予定ルーティン', skippedOccurrence:'この回はスキップ', canRestore:'再追加可能', menuFor:'{name} のメニュー', previewMenuFor:'{name} の予定メニュー', ghostMenuFor:'{name} の残存項目メニュー', restoreHint:'クリックすると再追加します。', duplicateRoutineDate:'この日には同じルーティンがすでにあります。', restoredTask:'{name} を再追加しました。', removeGhostConfirm:'「{name}」の残存項目を完全に削除しますか？', removedGhost:'{name} の残存項目を完全に削除しました。', movedToday:'{name} を今日へ移動しました。', skippedTask:'{name} のこの回をスキップしました。', movedDate:'{name} を {date} に移動しました。', copiedDates:'{name} を {n}日分複製しました。', deleteOccurrenceConfirm:'「{name}」を今日の一覧から削除しますか？\nルーティン自体は残ります。', deleteTaskConfirm:'「{name}」を削除しますか？', deletedTask:'{name} を削除しました。', occurrenceUpdated:'この回のタスクを更新しました。', taskUpdated:'タスクを更新しました。'
});
Object.assign(UI_TEXT.zh,{
  addTaskFailed:'添加任务失败。', taskAdded:'已添加任务。', duplicateCategory:'已有同名分类。', duplicateGroup:'已有同名分组。', moveUp:'将 {name} 上移', moveDown:'将 {name} 下移', categoryDisabled:'已停止使用分类 {name}。', groupDisabled:'已停止使用分组 {name}。', categoryDeleted:'已删除分类 {name} 及其关联任务和例行任务。', categoryMerged:'已将分类 {from} 合并到 {to}。', groupMerged:'已将分组 {from} 合并到 {to}。', renamedTo:'已将 {from} → {to}。', routineSaved:'例行任务 {name} 已{mode}。', routineAddedWord:'添加', routineEditedWord:'更新', routineDeleteFailed:'删除例行任务失败 · {error}', routineTaxonomyNormalized:'已将 {n} 个例行任务按当前分类整理。', routineRecalculated:'已按当前规则重新计算今天之后的例行任务与 Preview。', groupHidden:'已在选择列表中隐藏 {category} · {group}。', groupHideFailed:'隐藏分组失败。', none:'无', monthReviewNotFound:'找不到要保存的月度回顾界面。', monthReviewImageFailed:'保存图片失败，请查看控制台。', prevYear:'上一年', nextYear:'下一年', go:'前往', toggleCompletedAria:'切换已完成任务显示', toggleClassificationAria:'切换全部分类和分组显示', addTaskFor:'向 {name} 添加任务', addTaskForGroup:'向 {category} · {group} 添加任务', undoComplete:'标记为未完成', previewRoutine:'计划中的例行任务', skippedOccurrence:'已跳过本次', canRestore:'可重新添加', menuFor:'{name} 菜单', previewMenuFor:'{name} 计划菜单', ghostMenuFor:'{name} 残留项菜单', restoreHint:'点击可重新添加。', duplicateRoutineDate:'该日期已有相同例行任务。', restoredTask:'已重新添加 {name}。', removeGhostConfirm:'要永久移除“{name}”残留项吗？', removedGhost:'已永久移除 {name} 残留项。', movedToday:'已将 {name} 移到今天。', skippedTask:'已跳过 {name} 本次任务。', movedDate:'已将 {name} 移到 {date}。', copiedDates:'已将 {name} 复制到 {n} 个日期。', deleteOccurrenceConfirm:'要从今天列表删除“{name}”吗？\n例行任务本身会保留。', deleteTaskConfirm:'要删除“{name}”吗？', deletedTask:'已删除 {name}。', occurrenceUpdated:'已更新本次任务。', taskUpdated:'已更新任务。'
});

Object.assign(UI_TEXT.ko,{
  undoAction:'실행 취소', redoAction:'다시 실행',
  undoHint:'실행 취소 (Ctrl+Z)', redoHint:'다시 실행 (Ctrl+Shift+Z / Ctrl+Y)',
  undoDone:'실행 취소했습니다.', redoDone:'다시 실행했습니다.',
  historyConflict:'동기화 또는 다른 변경으로 데이터가 달라져 취소/다시 실행 기록을 초기화했습니다.'
});
Object.assign(UI_TEXT.en,{
  undoAction:'Undo', redoAction:'Redo',
  undoHint:'Undo (Ctrl+Z)', redoHint:'Redo (Ctrl+Shift+Z / Ctrl+Y)',
  undoDone:'Undone.', redoDone:'Redone.',
  historyConflict:'Undo/redo history was cleared because synced or external changes modified the data.'
});
Object.assign(UI_TEXT.ja,{
  undoAction:'元に戻す', redoAction:'やり直す',
  undoHint:'元に戻す (Ctrl+Z)', redoHint:'やり直す (Ctrl+Shift+Z / Ctrl+Y)',
  undoDone:'元に戻しました。', redoDone:'やり直しました。',
  historyConflict:'同期または外部変更でデータが変わったため、元に戻す／やり直す履歴を初期化しました。'
});
Object.assign(UI_TEXT.zh,{
  undoAction:'撤销', redoAction:'重做',
  undoHint:'撤销 (Ctrl+Z)', redoHint:'重做 (Ctrl+Shift+Z / Ctrl+Y)',
  undoDone:'已撤销。', redoDone:'已重做。',
  historyConflict:'由于同步或外部更改修改了数据，撤销/重做历史已清除。'
});



Object.assign(UI_TEXT.ko,{
  onboardingWelcomeTitle:'Momoan Todo에 오신 것을 환영합니다',
  onboardingWelcomeLine1:'할 일을 날짜와 분류로 정리하고, 반복 일정은 루틴으로 관리합니다.',
  onboardingWelcomeLine2:'1분 정도면 기본 사용법과 시작 설정을 끝낼 수 있습니다.',
  onboardingStart:'시작하기',
  guideStructureLine1:'할 일은 카테고리 > 그룹 > 할 일 순서로 정리됩니다.',
  guideStructureLine2:"예시에서는 '업무' 카테고리 내에 '기타' 그룹으로 '회의 자료 정리'라는 할일이 존재합니다.",
  guideControlsLine1:'새 할 일은 +, 반복 일정은 루틴, 분류 수정은 ☰에서 시작합니다.',
  guideControlsLine2:'완료와 분류 토글은 현재 화면에 무엇을 보여줄지 바꿉니다.',
  guideRoutinePreviewTitle:'루틴과 Preview',
  guideRoutinePreviewLine1:'반복 일정은 너무 먼 미래까지 실제 할 일로 만들지 않습니다.',
  guideRoutinePreviewLine2:'점(·)은 아직 체크할 수 없는 Preview이고, 7일 안으로 들어오면 실제 할 일이 됩니다.',
  guideCalendarLine1:'날짜 위의 표시만 보면 그날 상태를 알 수 있습니다.',
  guideCalendarLine2:'체크: 모두 완료 / 숫자: 남은 할 일 / 점: Preview / 빈칸: 할 일 없음',
  guideManageReviewTitle:'할 일 관리와 월간 회고',
  guideManageReviewLine1:'할 일 제목을 누르는 방식에 따라 관리·이름 수정·순서 변경을 할 수 있습니다.',
  guideManageReviewLine2:'한 달이 끝나면 캘린더 아래에서 월간 회고도 확인할 수 있습니다.',
  guideExistingLine1:'이 Vault는 이미 설정되어 있습니다.',
  guideExistingLine2:'저장 위치와 분류는 플러그인 설정에서 변경할 수 있습니다.',
  setupWizardHeader:'시작 설정', setupWizardStep:'{current}/3', setupNext:'다음',
  setupStorageTitle:'데이터를 저장할 위치를 정합니다',
  setupStorageLine1:'할 일과 루틴 데이터가 저장될 Vault 내부 폴더입니다.',
  setupStorageLine2:'특별한 이유가 없다면 기본값 그대로 사용해도 됩니다.',
  setupTemplateTitle:'분류 템플릿을 선택합니다',
  setupTemplateLine1:'처음 시작하기 편한 분류를 선택하세요.',
  setupTemplateLine2:'카테고리와 그룹은 나중에 언제든 바꿀 수 있습니다.',
  setupReadyTitle:'준비가 끝났습니다', setupStorageSummary:'저장 위치', setupTemplateSummary:'템플릿', firstTask:'첫 할 일 추가하기',
  routineFrequent:'매일 · 평일 · 주말 · 매주', routineLongTerm:'매월 · 월말 · 매년', routineActual7:'앞으로 7일 → 실제 할 일', routineFutureFlow:'미래 → Preview → 7일 안 → 실제 할 일'
});
Object.assign(UI_TEXT.en,{
  onboardingWelcomeTitle:'Welcome to Momoan Todo',
  onboardingWelcomeLine1:'Organize tasks by date and classification, and manage repeats as routines.',
  onboardingWelcomeLine2:'You can learn the basics and finish setup in about a minute.', onboardingStart:'Get started',
  guideStructureLine1:'Order: Category > Group > Task.',
  guideStructureLine2:'Example: Work > Other > Organize meeting notes.',
  guideControlsLine1:'Use + for a new task, Routines for repeats, and ☰ to edit classifications.',
  guideControlsLine2:'The Done and Classification toggles change what appears on the current screen.',
  guideRoutinePreviewTitle:'Routines and Preview',
  guideRoutinePreviewLine1:'Routine items are not created as actual tasks too far into the future.',
  guideRoutinePreviewLine2:'A dot (·) is a non-checkable Preview; it becomes an actual task within 7 days.',
  guideCalendarLine1:'Markers above dates show each day’s state.',
  guideCalendarLine2:'Check: all done / Number: tasks left / Dot: Preview / Blank: no tasks',
  guideManageReviewTitle:'Task management and monthly review',
  guideManageReviewLine1:'How you press a task title controls manage, rename, and reorder actions.',
  guideManageReviewLine2:'At month end, review your activity below the calendar.',
  guideExistingLine1:'This Vault is already configured.', guideExistingLine2:'Change storage and classifications in plugin settings.',
  setupWizardHeader:'Start setup', setupWizardStep:'{current}/3', setupNext:'Next',
  setupStorageTitle:'Choose where to store your data', setupStorageLine1:'This Vault folder stores your tasks and routines.', setupStorageLine2:'Keep the default unless you have a reason to change it.',
  setupTemplateTitle:'Choose a classification template', setupTemplateLine1:'Pick a structure that is easy to start with.', setupTemplateLine2:'You can change categories and groups later.',
  setupReadyTitle:'You’re ready', setupStorageSummary:'Storage', setupTemplateSummary:'Template', firstTask:'Add your first task',
  routineFrequent:'Daily · Weekdays · Weekends · Weekly', routineLongTerm:'Monthly · Month-end · Yearly', routineActual7:'Next 7 days → actual tasks', routineFutureFlow:'Future → Preview → within 7 days → actual task'
});
Object.assign(UI_TEXT.ja,{
  onboardingWelcomeTitle:'Momoan Todoへようこそ', onboardingWelcomeLine1:'タスクを日付と分類で整理し、繰り返し予定はルーティンで管理します。', onboardingWelcomeLine2:'約1分で基本操作と初期設定を終えられます。', onboardingStart:'はじめる',
  guideStructureLine1:'順序: カテゴリ > グループ > タスク', guideStructureLine2:'例: 仕事 > その他 > 会議資料を整理',
  guideControlsLine1:'新しいタスクは +、繰り返しはルーティン、分類編集は ☰ から始めます。', guideControlsLine2:'完了・分類トグルで現在の画面に表示する内容を切り替えます。',
  guideRoutinePreviewTitle:'ルーティンとPreview', guideRoutinePreviewLine1:'ルーティンは遠い未来まで実タスクとして作成しません。', guideRoutinePreviewLine2:'点（·）はまだチェックできないPreviewで、7日以内に入ると実タスクになります。',
  guideCalendarLine1:'日付上の表示で状態が分かります。', guideCalendarLine2:'チェック: 完了 / 数字: 残りタスク / 点: Preview / 空欄: タスクなし',
  guideManageReviewTitle:'タスク管理と月間レビュー', guideManageReviewLine1:'タスク名の押し方で管理・名前変更・並べ替えができます。', guideManageReviewLine2:'月末にはカレンダー下で月間レビューを確認できます。',
  guideExistingLine1:'このVaultはすでに設定済みです。', guideExistingLine2:'保存先と分類はプラグイン設定から変更できます。',
  setupWizardHeader:'初期設定', setupWizardStep:'{current}/3', setupNext:'次へ', setupStorageTitle:'データの保存先を決めます', setupStorageLine1:'タスクとルーティンを保存するVault内フォルダです。', setupStorageLine2:'特別な理由がなければ初期値のままで構いません。',
  setupTemplateTitle:'分類テンプレートを選びます', setupTemplateLine1:'始めやすい分類を選んでください。', setupTemplateLine2:'カテゴリとグループは後からいつでも変更できます。',
  setupReadyTitle:'準備完了です', setupStorageSummary:'保存先', setupTemplateSummary:'テンプレート', firstTask:'最初のタスクを追加',
  routineFrequent:'毎日 · 平日 · 週末 · 毎週', routineLongTerm:'毎月 · 月末 · 毎年', routineActual7:'今後7日 → 実タスク', routineFutureFlow:'未来 → Preview → 7日以内 → 実タスク'
});
Object.assign(UI_TEXT.zh,{
  onboardingWelcomeTitle:'欢迎使用 Momoan Todo', onboardingWelcomeLine1:'按日期和分类整理任务，并用例行任务管理重复事项。', onboardingWelcomeLine2:'大约1分钟即可了解基本用法并完成初始设置。', onboardingStart:'开始',
  guideStructureLine1:'顺序：分类 > 分组 > 任务', guideStructureLine2:'示例：工作 > 其他 > 整理会议资料',
  guideControlsLine1:'新任务用 +，重复事项用例行任务，分类修改从 ☰ 开始。', guideControlsLine2:'完成与分类开关决定当前画面显示哪些内容。',
  guideRoutinePreviewTitle:'例行任务与 Preview', guideRoutinePreviewLine1:'例行任务不会把很远的未来都提前生成成实际任务。', guideRoutinePreviewLine2:'点（·）表示暂时不能勾选的 Preview，进入7天范围后会变成实际任务。',
  guideCalendarLine1:'日期上方标记显示当天状态。', guideCalendarLine2:'勾选: 全部完成 / 数字: 剩余任务 / 点: Preview / 空白: 无任务',
  guideManageReviewTitle:'任务管理与月度回顾', guideManageReviewLine1:'按任务标题的方式不同，可进行管理、改名和排序。', guideManageReviewLine2:'每月结束时，可在日历下方查看月度回顾。',
  guideExistingLine1:'此 Vault 已完成设置。', guideExistingLine2:'保存位置和分类可在插件设置中修改。',
  setupWizardHeader:'开始设置', setupWizardStep:'{current}/3', setupNext:'下一步', setupStorageTitle:'选择数据保存位置', setupStorageLine1:'这是保存任务和例行任务的 Vault 内部文件夹。', setupStorageLine2:'如果没有特殊需要，保留默认值即可。',
  setupTemplateTitle:'选择分类模板', setupTemplateLine1:'请选择一个容易开始的分类结构。', setupTemplateLine2:'分类和分组以后都可以随时修改。',
  setupReadyTitle:'准备完成', setupStorageSummary:'保存位置', setupTemplateSummary:'模板', firstTask:'添加第一个任务',
  routineFrequent:'每天 · 工作日 · 周末 · 每周', routineLongTerm:'每月 · 月末 · 每年', routineActual7:'未来7天 → 实际任务', routineFutureFlow:'未来 → Preview → 7天内 → 实际任务'
});





// v0.9.21 — simple routine examples used by the onboarding diagram.
Object.assign(UI_TEXT.ko,{ guideRoutineNearExample:'3일 뒤', guideRoutineFarExample:'3개월 뒤' });
Object.assign(UI_TEXT.en,{ guideRoutineNearExample:'In 3 days', guideRoutineFarExample:'In 3 months' });
Object.assign(UI_TEXT.ja,{ guideRoutineNearExample:'3日後', guideRoutineFarExample:'3か月後' });
Object.assign(UI_TEXT.zh,{ guideRoutineNearExample:'3天后', guideRoutineFarExample:'3个月后' });

// v0.9.22 — guide terminology polish: localize Preview wording inside onboarding only.
Object.assign(UI_TEXT.ko,{
  guideRoutinePreview:'프리뷰', guidePreviewDot:'프리뷰',
  guideRoutineConceptLine2:'가까운 일정은 실제 할 일, 먼 월간·연간 일정은 프리뷰로 표시됩니다.',
  guideCalendarLine2:'체크: 모두 완료 / 숫자: 남은 할 일 / 점: 프리뷰 / 빈칸: 할 일 없음'
});
Object.assign(UI_TEXT.en,{
  guideRoutinePreview:'Preview', guidePreviewDot:'Preview',
  guideRoutineConceptLine2:'Near dates are actual tasks; distant monthly and yearly dates appear as Preview.',
  guideCalendarLine2:'Check: all done / Number: tasks left / Dot: Preview / Blank: no tasks'
});
Object.assign(UI_TEXT.ja,{
  guideRoutinePreview:'プレビュー', guidePreviewDot:'プレビュー',
  guideRoutineConceptLine2:'近い予定は実タスク、遠い月間・年間予定はプレビューで表示します。',
  guideCalendarLine2:'チェック: 完了 / 数字: 残りタスク / 点: プレビュー / 空欄: タスクなし'
});
Object.assign(UI_TEXT.zh,{
  guideRoutinePreview:'预览', guidePreviewDot:'预览',
  guideRoutineConceptLine2:'临近日期显示为实际任务，较远的月度和年度日期显示为预览。',
  guideCalendarLine2:'勾选: 全部完成 / 数字: 剩余任务 / 点: 预览 / 空白: 无任务'
});

// v0.9.13 — onboarding copy: first-use mental model → actions → setup
Object.assign(UI_TEXT.ko,{
  guideOverviewTitle:'화면 구성', guideOverviewLine1:'왼쪽은 캘린더, 오른쪽은 선택한 날짜의 할 일 목록입니다.', guideOverviewLine2:'캘린더에서 날짜를 고르면 오른쪽 목록이 그 날짜의 할 일로 바뀝니다.',
  guideTaskListTitle:'날짜별 할 일', guideTaskListLine1:'목록에서 새 할 일을 추가하고 완료·분류 표시를 바꿉니다.', guideTaskListLine2:'예시처럼 날짜를 선택한 뒤 그날의 할 일을 바로 확인하고 정리할 수 있습니다.',
  guideRoutineConceptTitle:'루틴', guideRoutineConceptLine1:'루틴은 반복되는 할 일을 자동으로 만들어 주는 기능입니다.', guideRoutineConceptLine2:'가까운 일정은 실제 할 일, 먼 월간·연간 일정은 Preview로 표시됩니다.',
  guideManageTitle:'할 일 관리', guideManageLine1:'할 일 제목을 누르는 방식에 따라 관리 메뉴·이름 수정·순서 변경이 열립니다.', guideManageLine2:'한 번 클릭은 관리, 빠른 두 번 클릭은 이름 수정, 길게 누르기는 순서 변경입니다.',
  guideMonthlyTitle:'월간 회고', guideMonthlyLine1:'캘린더 아래에서 한 달의 변화와 많이 사용한 카테고리·그룹을 확인합니다.', guideMonthlyLine2:'회고록을 작성하거나 현재 회고 화면을 이미지로 저장할 수도 있습니다.',
  guideSetupIntroTitle:'다음은 시작 설정입니다', guideSetupIntroLine1:'가이드가 끝나면 데이터 저장 위치와 분류 템플릿을 정합니다.', guideSetupIntroLine2:'설정을 마치면 바로 첫 할 일을 추가하면서 시작할 수 있습니다.',
  guideExistingSetupTitle:'이 Vault는 이미 설정되어 있습니다', guideExistingSetupLine1:'현재 데이터와 분류는 그대로 유지됩니다.', guideExistingSetupLine2:'저장 위치와 분류는 플러그인 설정에서 언제든 변경할 수 있습니다.',
  guideCalendarPane:'캘린더', guideTaskPane:'선택한 날짜의 할 일', guideSelectDateHint:'날짜 선택', guideExampleDate:'9월 10일 (목)', guideExampleMonth:'2026년 9월', guideRoutineDefinition:'', guideRoutineExample:'출근 · 평일 · 10:00', guideRoutineNear:'가까운 일정', guideRoutineActual:'실제 할 일', guideRoutineFar:'먼 월간·연간 일정', guideRoutinePreview:'프리뷰', guideSetupStorageShort:'저장 위치', guideSetupTemplateShort:'분류 템플릿', guideSetupFirstTaskShort:'첫 할 일 추가', guideConfigured:'설정 완료', guideCurrentStorageShort:'현재 저장소', guideStartSetup:'설정 시작'
});
Object.assign(UI_TEXT.en,{
  guideOverviewTitle:'Screen layout', guideOverviewLine1:'Calendar left; selected day’s tasks right.', guideOverviewLine2:'Pick a date to update the task list.',
  guideTaskListTitle:'Tasks by date', guideTaskListLine1:'Add tasks and toggle Done or Groups.', guideTaskListLine2:'Pick a date to review and organize its tasks.',
  guideRoutineConceptTitle:'Routines', guideRoutineConceptLine1:'Routines create repeating tasks automatically.', guideRoutineConceptLine2:'Near dates are tasks; distant monthly/yearly dates are previews.',
  guideManageTitle:'Task management', guideManageLine1:'Press a task title to manage, rename, or reorder.', guideManageLine2:'Click once / double-click / long-press.',
  guideMonthlyTitle:'Monthly review', guideMonthlyLine1:'See monthly change and top category/group below the calendar.', guideMonthlyLine2:'Write a review or save this panel as an image.',
  guideSetupIntroTitle:'Next: start setup', guideSetupIntroLine1:'After the guide, choose a data folder and a classification template.', guideSetupIntroLine2:'When setup is complete, you can immediately add your first task.',
  guideExistingSetupTitle:'This Vault is already configured', guideExistingSetupLine1:'Your current data and classifications will stay unchanged.', guideExistingSetupLine2:'You can change storage and classifications later in plugin settings.',
  guideCalendarPane:'Calendar', guideTaskPane:'Selected day', guideSelectDateHint:'Select a date', guideExampleDate:'Thu, Sep 10', guideExampleMonth:'Sep 2026', guideRoutineDefinition:'', guideRoutineExample:'Commute · Weekdays · 10:00', guideRoutineNear:'Near dates', guideRoutineActual:'Actual tasks', guideRoutineFar:'Distant monthly/yearly dates', guideRoutinePreview:'Preview', guideSetupStorageShort:'Storage', guideSetupTemplateShort:'Template', guideSetupFirstTaskShort:'First task', guideConfigured:'Configured', guideCurrentStorageShort:'Current storage', guideStartSetup:'Start setup'
});
Object.assign(UI_TEXT.ja,{
  guideOverviewTitle:'画面構成', guideOverviewLine1:'左にカレンダー、右に選択日のタスク。', guideOverviewLine2:'日付を選ぶと右側が切り替わります。',
  guideTaskListTitle:'日付ごとのタスク', guideTaskListLine1:'タスク追加と完了・分類表示を切り替えます。', guideTaskListLine2:'日付を選び、その日のタスクを整理します。',
  guideRoutineConceptTitle:'ルーティン', guideRoutineConceptLine1:'ルーティンは繰り返しタスクを自動作成します。', guideRoutineConceptLine2:'近い予定は実タスク、遠い月・年予定はプレビューです。',
  guideManageTitle:'タスク管理', guideManageLine1:'タスク名から管理・改名・並べ替えができます。', guideManageLine2:'1回 / 2回 / 長押しで操作します。',
  guideMonthlyTitle:'月間レビュー', guideMonthlyLine1:'カレンダー下で月の変化と上位カテゴリ・グループを確認します。', guideMonthlyLine2:'レビューを書いたり、画像保存できます。',
  guideSetupIntroTitle:'次は初期設定です', guideSetupIntroLine1:'ガイドの後でデータ保存先と分類テンプレートを決めます。', guideSetupIntroLine2:'設定が終わると、そのまま最初のタスクを追加できます。',
  guideExistingSetupTitle:'このVaultは設定済みです', guideExistingSetupLine1:'現在のデータと分類はそのまま維持されます。', guideExistingSetupLine2:'保存先と分類はプラグイン設定からいつでも変更できます。',
  guideCalendarPane:'カレンダー', guideTaskPane:'選択日のタスク', guideSelectDateHint:'日付を選択', guideExampleDate:'9月10日（木）', guideExampleMonth:'2026年9月', guideRoutineDefinition:'', guideRoutineExample:'出勤 · 平日 · 10:00', guideRoutineNear:'近い予定', guideRoutineActual:'実タスク', guideRoutineFar:'遠い月間・年間予定', guideRoutinePreview:'プレビュー', guideSetupStorageShort:'保存先', guideSetupTemplateShort:'分類テンプレート', guideSetupFirstTaskShort:'最初のタスク', guideConfigured:'設定済み', guideCurrentStorageShort:'現在の保存先', guideStartSetup:'設定を開始'
});
Object.assign(UI_TEXT.zh,{
  guideOverviewTitle:'界面结构', guideOverviewLine1:'左侧日历，右侧所选日期任务。', guideOverviewLine2:'选择日期后，右侧列表会更新。',
  guideTaskListTitle:'按日期查看任务', guideTaskListLine1:'添加任务，并切换完成/分类显示。', guideTaskListLine2:'选择日期后直接整理当天任务。',
  guideRoutineConceptTitle:'例行任务', guideRoutineConceptLine1:'例行任务会自动生成重复任务。', guideRoutineConceptLine2:'近期待办为实际任务，远期月/年为预览。',
  guideManageTitle:'任务管理', guideManageLine1:'点击任务标题可管理、改名或排序。', guideManageLine2:'单击 / 双击 / 长按即可操作。',
  guideMonthlyTitle:'月度回顾', guideMonthlyLine1:'在日历下查看月度变化和常用分类/分组。', guideMonthlyLine2:'可写回顾，也可保存为图片。',
  guideSetupIntroTitle:'下一步：开始设置', guideSetupIntroLine1:'指南结束后，选择数据保存位置和分类模板。', guideSetupIntroLine2:'完成设置后即可直接添加第一个任务。',
  guideExistingSetupTitle:'此 Vault 已完成设置', guideExistingSetupLine1:'当前数据和分类会保持不变。', guideExistingSetupLine2:'保存位置和分类可随时在插件设置中修改。',
  guideCalendarPane:'日历', guideTaskPane:'所选任务', guideSelectDateHint:'选择日期', guideExampleDate:'9月10日（周四）', guideExampleMonth:'2026年9月', guideRoutineDefinition:'', guideRoutineExample:'上班 · 工作日 · 10:00', guideRoutineNear:'临近日期', guideRoutineActual:'实际任务', guideRoutineFar:'较远的月度/年度日期', guideRoutinePreview:'预览', guideSetupStorageShort:'保存位置', guideSetupTemplateShort:'分类模板', guideSetupFirstTaskShort:'第一个任务', guideConfigured:'已设置', guideCurrentStorageShort:'当前保存位置', guideStartSetup:'开始设置'
});


// v0.9.24 — final onboarding terminology overrides. Keep these after all older guide text assignments.
Object.assign(UI_TEXT.ko,{
  duplicateCategoryTag:'공백을 제외하면 같은 태그가 되는 카테고리가 이미 있습니다.',
  guideRoutineConceptLine2:'가까운 일정은 실제 할 일로, 먼 월간·연간 일정은 프리뷰로 표시됩니다.',
  guideCalendarLine2:'체크: 모두 완료 / 숫자: 남은 할 일 / 점: 프리뷰 / 빈칸: 할 일 없음',
  guideRoutinePreview:'프리뷰', guidePreviewDot:'프리뷰'
});
Object.assign(UI_TEXT.en,{
  duplicateCategoryTag:'Another category would use the same tag after spaces are removed.',
  guideRoutineConceptLine2:'Near dates are tasks; distant monthly/yearly dates are previews.',
  guideCalendarLine2:'✓ Done / Number Left / · Preview / Blank None',
  guideRoutinePreview:'Preview', guidePreviewDot:'Preview'
});
Object.assign(UI_TEXT.ja,{
  duplicateCategoryTag:'空白を除くと同じタグになるカテゴリがすでにあります。',
  guideRoutineConceptLine2:'近い予定は実タスク、遠い月・年予定はプレビューです。',
  guideCalendarLine2:'✓ 完了 / 数字 残り / · プレビュー / 空欄 なし',
  guideRoutinePreview:'プレビュー', guidePreviewDot:'プレビュー'
});
Object.assign(UI_TEXT.zh,{
  duplicateCategoryTag:'去除空格后会使用相同标签的分类已存在。',
  guideRoutineConceptLine2:'近期待办为实际任务，远期月/年为预览。',
  guideCalendarLine2:'✓ 完成 / 数字 剩余 / · 预览 / 空白 无',
  guideRoutinePreview:'预览', guidePreviewDot:'预览'
});

function normalizeLanguage(value='ko') { return SUPPORTED_LANGUAGES.has(value) ? value : 'ko'; }
function uiText(key, vars={}) {
  const table = UI_TEXT[ACTIVE_LANGUAGE] || UI_TEXT.ko;
  let value = table[key] ?? UI_TEXT.ko[key] ?? key;
  for (const [name, replacement] of Object.entries(vars)) value = String(value).replaceAll(`{${name}}`, String(replacement));
  return value;
}



function localizedMonthYear(year, monthIndex) {
  const m = Number(monthIndex) + 1;
  if (ACTIVE_LANGUAGE === 'en') return `${new Date(Number(year), Number(monthIndex), 1).toLocaleString('en-US',{month:'long'})} ${year}`;
  if (ACTIVE_LANGUAGE === 'ja') return `${year}年${m}月`;
  if (ACTIVE_LANGUAGE === 'zh') return `${year}年${m}月`;
  return `${year}년 ${m}월`;
}
function localizedMonthChoice(month) {
  const m=Number(month);
  if (ACTIVE_LANGUAGE==='en') return new Date(2024,m-1,1).toLocaleString('en-US',{month:'long'});
  if (ACTIVE_LANGUAGE==='ja') return `${m}月`;
  if (ACTIVE_LANGUAGE==='zh') return `${m}月`;
  return `${m}월`;
}
function localizedDayChoice(day) {
  const d=Number(day);
  if (ACTIVE_LANGUAGE==='en') return String(d);
  if (ACTIVE_LANGUAGE==='ja') return `${d}日`;
  if (ACTIVE_LANGUAGE==='zh') return `${d}日`;
  return `${d}일`;
}
function reviewJournalHeadings() {
  return ['월간 회고록','Monthly notes','月間レビュー記録','月度回顾记录'];
}

function normalizeWeekStart(value='monday') {
  return value === 'sunday' ? 'sunday' : 'monday';
}

const AUTO_SORT_CRITERIA = new Set(['time','titleLength','alphabet','manual']);
const AUTO_SORT_PRESETS = Object.freeze({
  quick:Object.freeze({
    priorities:Object.freeze(['time','titleLength','alphabet']),
    timedPlacement:'first', completedPlacement:'mixed', routinePlacement:'mixed'
  }),
  time:Object.freeze({
    priorities:Object.freeze(['time','alphabet','titleLength']),
    timedPlacement:'first', completedPlacement:'mixed', routinePlacement:'mixed'
  }),
  manual:Object.freeze({
    priorities:Object.freeze(['time','manual','titleLength']),
    timedPlacement:'first', completedPlacement:'mixed', routinePlacement:'mixed'
  })
});
function normalizeAutoSortPreset(value='quick') {
  return ['quick','time','manual','custom'].includes(value) ? value : 'quick';
}
function normalizeAutoSortCriterion(value='time', fallback='time') {
  return AUTO_SORT_CRITERIA.has(value) ? value : fallback;
}
function normalizeAutoSortPriorities(value) {
  const source = Array.isArray(value) ? value : AUTO_SORT_PRESETS.quick.priorities;
  const fallback = AUTO_SORT_PRESETS.quick.priorities;
  return [0,1,2].map(index => normalizeAutoSortCriterion(source[index], fallback[index]));
}
function normalizeAutoSortTimedPlacement(value='first') { return value === 'last' ? 'last' : 'first'; }
function normalizeAutoSortCompletedPlacement(value='mixed') { return value === 'bottom' ? 'bottom' : 'mixed'; }
function normalizeAutoSortRoutinePlacement(value='mixed') {
  return ['mixed','generalFirst','routineFirst'].includes(value) ? value : 'mixed';
}
function autoSortPresetConfig(name='quick') {
  const key = normalizeAutoSortPreset(name);
  return AUTO_SORT_PRESETS[key] || AUTO_SORT_PRESETS.quick;
}
function applyAutoSortPreset(target, name='quick') {
  const key = normalizeAutoSortPreset(name);
  if (key === 'custom') { target.autoSortPreset = 'custom'; return target; }
  const preset = autoSortPresetConfig(key);
  target.autoSortPreset = key;
  target.autoSortPriorities = [...preset.priorities];
  target.autoSortTimedPlacement = preset.timedPlacement;
  target.autoSortCompletedPlacement = preset.completedPlacement;
  target.autoSortRoutinePlacement = preset.routinePlacement;
  return target;
}
function normalizedAutoSortSettings(settings={}) {
  return {
    preset:normalizeAutoSortPreset(settings.autoSortPreset || 'quick'),
    priorities:normalizeAutoSortPriorities(settings.autoSortPriorities),
    timedPlacement:normalizeAutoSortTimedPlacement(settings.autoSortTimedPlacement),
    completedPlacement:normalizeAutoSortCompletedPlacement(settings.autoSortCompletedPlacement),
    routinePlacement:normalizeAutoSortRoutinePlacement(settings.autoSortRoutinePlacement)
  };
}

function activeWeekdayLabels() {
  const labels = {
    ko:['일','월','화','수','목','금','토'],
    en:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
    ja:['日','月','火','水','木','金','土'],
    zh:['日','一','二','三','四','五','六']
  }[ACTIVE_LANGUAGE] || ['일','월','화','수','목','금','토'];
  return ACTIVE_WEEK_START === 'sunday' ? labels : [...labels.slice(1), labels[0]];
}

function leadingDaysForWeek(dayIndex) {
  return ACTIVE_WEEK_START === 'sunday' ? dayIndex : (dayIndex + 6) % 7;
}


const SUPPORTED_HOLIDAY_REGIONS = new Set(['none','kr','us','jp','cn']);
const HOLIDAY_YEAR_CACHE = new Map();

function normalizeHolidayRegion(value='none') {
  const key = String(value || 'none').toLowerCase();
  return SUPPORTED_HOLIDAY_REGIONS.has(key) ? key : 'none';
}

function defaultHolidayRegionForLanguage(language='ko') {
  const lang = normalizeLanguage(language);
  if (lang === 'ko') return 'kr';
  if (lang === 'ja') return 'jp';
  if (lang === 'zh') return 'cn';
  if (lang === 'en') return 'us';
  return 'none';
}

function isoDateUTC(year, month, day) {
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

function addHoliday(map, date, name) {
  if (!date) return;
  const current = map.get(date);
  if (!current) map.set(date, { isHoliday:true, name:String(name || uiText('holidayGeneric')) });
  else if (name && !String(current.name || '').includes(String(name))) current.name = `${current.name} · ${name}`;
}

function addWorkdayOverride(map, date, name='') {
  map.set(date, { isHoliday:false, workdayOverride:true, name:String(name || uiText('adjustedWorkday')) });
}

function nthWeekdayOfMonth(year, month, weekday, nth) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const delta = (weekday - first.getUTCDay() + 7) % 7;
  return isoDateUTC(year, month, 1 + delta + (nth - 1) * 7);
}

function lastWeekdayOfMonth(year, month, weekday) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const last = new Date(Date.UTC(year, month - 1, lastDay));
  const delta = (last.getUTCDay() - weekday + 7) % 7;
  return isoDateUTC(year, month, lastDay - delta);
}

function observedUSDate(date) {
  const dow = parseDate(date).getUTCDay();
  if (dow === 6) return shiftDay(date, -1);
  if (dow === 0) return shiftDay(date, 1);
  return date;
}

function lunarMonthDay(date) {
  try {
    const probe = new Date(`${date}T12:00:00Z`);
    const parts = new Intl.DateTimeFormat('en-u-ca-chinese', {
      month:'numeric', day:'numeric', timeZone:'Asia/Seoul'
    }).formatToParts(probe);
    const monthPart = parts.find(part => part.type === 'month')?.value || '';
    const dayPart = parts.find(part => part.type === 'day')?.value || '';
    const month = Number.parseInt(monthPart, 10);
    const day = Number.parseInt(dayPart, 10);
    if (!Number.isFinite(month) || !Number.isFinite(day)) return null;
    return { month, day, leap:/bis|leap/i.test(monthPart) };
  } catch (_) {
    return null;
  }
}

function nextNonHoliday(map, date) {
  let cursor = shiftDay(date, 1);
  let guard = 0;
  while (map.get(cursor)?.isHoliday && guard < 14) {
    cursor = shiftDay(cursor, 1);
    guard += 1;
  }
  return cursor;
}

function buildKoreaHolidayMap(year) {
  const map = new Map();

  // Current-year authoritative patch. It includes the 2026 law changes
  // (Labour Day + Constitution Day), the nationwide local election day,
  // and the actual substitute holidays in force this year.
  if (year === 2026) {
    const rows = [
      ['2026-01-01','신정'],
      ['2026-02-16','설날 연휴'],['2026-02-17','설날'],['2026-02-18','설날 연휴'],
      ['2026-03-01','3·1절'],['2026-03-02','대체공휴일'],
      ['2026-05-01','노동절'],['2026-05-05','어린이날'],
      ['2026-05-24','부처님오신날'],['2026-05-25','대체공휴일'],
      ['2026-06-03','전국동시지방선거일'],['2026-06-06','현충일'],
      ['2026-07-17','제헌절'],
      ['2026-08-15','광복절'],['2026-08-17','대체공휴일'],
      ['2026-09-24','추석 연휴'],['2026-09-25','추석'],['2026-09-26','추석 연휴'],
      ['2026-10-03','개천절'],['2026-10-05','대체공휴일'],['2026-10-09','한글날'],
      ['2026-12-25','기독탄신일']
    ];
    for (const [date,name] of rows) addHoliday(map,date,name);
    return map;
  }

  const fixed = [
    [1,1,'신정'],[3,1,'3·1절'],[5,5,'어린이날'],[6,6,'현충일'],
    [8,15,'광복절'],[10,3,'개천절'],[10,9,'한글날'],[12,25,'기독탄신일']
  ];
  if (year >= 2026) fixed.push([5,1,'노동절'],[7,17,'제헌절']);
  for (const [month,day,name] of fixed) addHoliday(map,isoDateUTC(year,month,day),name);

  let seollal = null;
  let buddha = null;
  let chuseok = null;
  let cursor = isoDateUTC(year,1,1);
  const end = isoDateUTC(year,12,31);
  while (cursor <= end) {
    const lunar = lunarMonthDay(cursor);
    if (lunar && !lunar.leap) {
      if (!seollal && lunar.month === 1 && lunar.day === 1) seollal = cursor;
      if (!buddha && lunar.month === 4 && lunar.day === 8) buddha = cursor;
      if (!chuseok && lunar.month === 8 && lunar.day === 15) chuseok = cursor;
    }
    cursor = shiftDay(cursor,1);
  }
  if (seollal) {
    addHoliday(map,shiftDay(seollal,-1),'설날 연휴'); addHoliday(map,seollal,'설날'); addHoliday(map,shiftDay(seollal,1),'설날 연휴');
    const period=[shiftDay(seollal,-1),seollal,shiftDay(seollal,1)];
    if (period.some(d=>parseDate(d).getUTCDay()===0)) addHoliday(map,nextNonHoliday(map,period[2]),'대체공휴일');
  }
  if (buddha) addHoliday(map,buddha,'부처님오신날');
  if (chuseok) {
    addHoliday(map,shiftDay(chuseok,-1),'추석 연휴'); addHoliday(map,chuseok,'추석'); addHoliday(map,shiftDay(chuseok,1),'추석 연휴');
    const period=[shiftDay(chuseok,-1),chuseok,shiftDay(chuseok,1)];
    if (period.some(d=>parseDate(d).getUTCDay()===0)) addHoliday(map,nextNonHoliday(map,period[2]),'대체공휴일');
  }

  // Current substitute-holiday behaviour for single-day holidays. This is a
  // future-facing fallback; annual one-off holidays can be added in Settings.
  const eligible = [
    isoDateUTC(year,3,1), isoDateUTC(year,5,5), buddha,
    isoDateUTC(year,8,15), isoDateUTC(year,10,3), isoDateUTC(year,10,9), isoDateUTC(year,12,25)
  ].filter(Boolean);
  if (year >= 2026) eligible.push(isoDateUTC(year,5,1), isoDateUTC(year,7,17));
  for (const original of eligible) {
    const dow = parseDate(original).getUTCDay();
    if (dow === 0 || dow === 6) addHoliday(map,nextNonHoliday(map,original),'대체공휴일');
  }
  return map;
}

function buildUSHolidayMap(year) {
  const map = new Map();
  const fixed = [
    [1,1,"New Year's Day"],[6,19,'Juneteenth'],[7,4,'Independence Day'],
    [11,11,'Veterans Day'],[12,25,'Christmas Day']
  ];
  for (const [month,day,name] of fixed) {
    const date = isoDateUTC(year,month,day);
    addHoliday(map,date,name);
    const observed = observedUSDate(date);
    if (observed !== date) addHoliday(map,observed,`${name} (observed)`);
  }
  // Jan 1 of the next year can be observed on Dec 31 of this year.
  const nextNewYear = isoDateUTC(year+1,1,1);
  const observedNextNewYear = observedUSDate(nextNewYear);
  if (observedNextNewYear.startsWith(`${year}-`)) addHoliday(map,observedNextNewYear,"New Year's Day (observed)");
  addHoliday(map,nthWeekdayOfMonth(year,1,1,3),'Martin Luther King Jr. Day');
  addHoliday(map,nthWeekdayOfMonth(year,2,1,3),"Washington's Birthday");
  addHoliday(map,lastWeekdayOfMonth(year,5,1),'Memorial Day');
  addHoliday(map,nthWeekdayOfMonth(year,9,1,1),'Labor Day');
  addHoliday(map,nthWeekdayOfMonth(year,10,1,2),'Columbus Day');
  addHoliday(map,nthWeekdayOfMonth(year,11,4,4),'Thanksgiving Day');
  return map;
}

function japaneseEquinoxDay(year, autumn=false) {
  if (year < 1980 || year > 2099) return autumn ? 23 : 20;
  const base = autumn ? 23.2488 : 20.8431;
  return Math.floor(base + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

function buildJapanHolidayMap(year) {
  const map = new Map();
  const rows = [
    [isoDateUTC(year,1,1),'元日'],[nthWeekdayOfMonth(year,1,1,2),'成人の日'],
    [isoDateUTC(year,2,11),'建国記念の日'],[isoDateUTC(year,2,23),'天皇誕生日'],
    [isoDateUTC(year,3,japaneseEquinoxDay(year,false)),'春分の日'],
    [isoDateUTC(year,4,29),'昭和の日'],[isoDateUTC(year,5,3),'憲法記念日'],
    [isoDateUTC(year,5,4),'みどりの日'],[isoDateUTC(year,5,5),'こどもの日'],
    [nthWeekdayOfMonth(year,7,1,3),'海の日'],[isoDateUTC(year,8,11),'山の日'],
    [nthWeekdayOfMonth(year,9,1,3),'敬老の日'],
    [isoDateUTC(year,9,japaneseEquinoxDay(year,true)),'秋分の日'],
    [nthWeekdayOfMonth(year,10,1,2),'スポーツの日'],
    [isoDateUTC(year,11,3),'文化の日'],[isoDateUTC(year,11,23),'勤労感謝の日']
  ];
  for (const [date,name] of rows) addHoliday(map,date,name);

  // 国民の休日: a non-holiday sandwiched between two national holidays.
  let cursor = isoDateUTC(year,1,2);
  const end = isoDateUTC(year,12,30);
  while (cursor <= end) {
    if (!map.get(cursor)?.isHoliday && map.get(shiftDay(cursor,-1))?.isHoliday && map.get(shiftDay(cursor,1))?.isHoliday) {
      addHoliday(map,cursor,'国民の休日');
    }
    cursor = shiftDay(cursor,1);
  }

  // 振替休日: when a national holiday falls on Sunday, the next non-holiday day is off.
  const sundayHolidays = [...map.entries()].filter(([date,info]) => info.isHoliday && parseDate(date).getUTCDay() === 0);
  for (const [date] of sundayHolidays) addHoliday(map,nextNonHoliday(map,date),'振替休日');
  return map;
}

function qingmingDay(year) {
  if (year >= 2000 && year <= 2099) return Math.floor(year * 0.2422 + 4.81) - Math.floor((year - 1) / 4);
  return 5;
}

function buildChinaHolidayMap(year) {
  const map = new Map();
  if (year === 2026) {
    const ranges = [
      ['2026-01-01','2026-01-03','元旦'],
      ['2026-02-15','2026-02-23','春节'],
      ['2026-04-04','2026-04-06','清明节'],
      ['2026-05-01','2026-05-05','劳动节'],
      ['2026-06-19','2026-06-21','端午节'],
      ['2026-09-25','2026-09-27','中秋节'],
      ['2026-10-01','2026-10-07','国庆节']
    ];
    for (const [start,end,name] of ranges) {
      let cursor=start;
      while (cursor <= end) { addHoliday(map,cursor,name); cursor=shiftDay(cursor,1); }
    }
    for (const date of ['2026-01-04','2026-02-14','2026-02-28','2026-05-09','2026-09-20','2026-10-10']) {
      addWorkdayOverride(map,date,'调休工作日');
    }
    return map;
  }

  // Statutory core dates for years whose annual State Council adjustment
  // schedule is not bundled yet. Weekend swaps are intentionally not guessed.
  addHoliday(map,isoDateUTC(year,1,1),'元旦');
  addHoliday(map,isoDateUTC(year,5,1),'劳动节');
  if (year >= 2025) addHoliday(map,isoDateUTC(year,5,2),'劳动节');
  for (let d=1; d<=3; d++) addHoliday(map,isoDateUTC(year,10,d),'国庆节');
  addHoliday(map,isoDateUTC(year,4,qingmingDay(year)),'清明节');

  let lunarNewYear=null, dragonBoat=null, midAutumn=null;
  let cursor=isoDateUTC(year,1,1), end=isoDateUTC(year,12,31);
  while (cursor<=end) {
    const lunar=lunarMonthDay(cursor);
    if (lunar && !lunar.leap) {
      if (!lunarNewYear && lunar.month===1 && lunar.day===1) lunarNewYear=cursor;
      if (!dragonBoat && lunar.month===5 && lunar.day===5) dragonBoat=cursor;
      if (!midAutumn && lunar.month===8 && lunar.day===15) midAutumn=cursor;
    }
    cursor=shiftDay(cursor,1);
  }
  if (lunarNewYear) {
    addHoliday(map,shiftDay(lunarNewYear,-1),'除夕');
    for (let i=0;i<3;i++) addHoliday(map,shiftDay(lunarNewYear,i),'春节');
  }
  if (dragonBoat) addHoliday(map,dragonBoat,'端午节');
  if (midAutumn) addHoliday(map,midAutumn,'中秋节');
  return map;
}

function holidayMapForYear(region, year) {
  const normalized = normalizeHolidayRegion(region);
  const key = `${normalized}:${year}`;
  if (HOLIDAY_YEAR_CACHE.has(key)) return HOLIDAY_YEAR_CACHE.get(key);
  let map = new Map();
  if (normalized === 'kr') map = buildKoreaHolidayMap(year);
  else if (normalized === 'us') map = buildUSHolidayMap(year);
  else if (normalized === 'jp') map = buildJapanHolidayMap(year);
  else if (normalized === 'cn') map = buildChinaHolidayMap(year);
  HOLIDAY_YEAR_CACHE.set(key,map);
  return map;
}

function parseCustomHolidayText(value='') {
  const map = new Map();
  const parts = String(value || '').split(/[;,\n]+/).map(x=>x.trim()).filter(Boolean);
  for (const part of parts) {
    const match = part.match(/^(\d{4}-\d{2}-\d{2})(?:\s*=\s*(.+))?$/);
    if (!match) continue;
    map.set(match[1], String(match[2] || uiText('holidayGeneric')).trim());
  }
  return map;
}

function getCalendarHolidayInfo(date, settings={}) {
  const region = normalizeHolidayRegion(settings.holidayRegion || 'none');
  const year = Number(String(date).slice(0,4));
  const regional = holidayMapForYear(region,year).get(date) || null;
  const custom = parseCustomHolidayText(settings.customHolidays || '').get(date);
  if (custom) return { isHoliday:true, workdayOverride:false, name:custom, custom:true };
  if (regional) return { ...regional };
  return { isHoliday:false, workdayOverride:false, name:'' };
}

function normalizeVaultPath(path='') {
  return String(path || '')
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/{2,}/g, '/');
}

function storagePathsFromRoot(root=DEFAULT_STORAGE_ROOT) {
  const cleanRoot = normalizeVaultPath(root) || DEFAULT_STORAGE_ROOT;
  return {
    root:cleanRoot,
    dataFolder:`${cleanRoot}/Data`,
    dailyFolder:`${cleanRoot}/Daily`,
    monthlyRecordFolder:`${cleanRoot}/Monthly Records`,
    monthlyReviewFolder:`${cleanRoot}/Monthly Reviews`,
    taskHubPath:`${cleanRoot}/Tasks.md`,
    routineOverviewPath:`${cleanRoot}/Routine Overview.md`,
    routinePath:`${cleanRoot}/Routines.md`
  };
}

let ACTIVE_STORAGE_PATHS = { ...LEGACY_STORAGE_PATHS };
let DATA_FOLDER = ACTIVE_STORAGE_PATHS.dataFolder;
let DAILY_FOLDER = ACTIVE_STORAGE_PATHS.dailyFolder;
let MONTHLY_RECORD_FOLDER = ACTIVE_STORAGE_PATHS.monthlyRecordFolder;
let MONTHLY_REVIEW_FOLDER = ACTIVE_STORAGE_PATHS.monthlyReviewFolder;
let TASK_HUB_PATH = ACTIVE_STORAGE_PATHS.taskHubPath;
let ROUTINE_OVERVIEW_PATH = ACTIVE_STORAGE_PATHS.routineOverviewPath;
let ROUTINE_PATH = ACTIVE_STORAGE_PATHS.routinePath;

// v0.9.36 — one serialized mutation lane per Vault file.
// Every read→transform→write path for task/routine text should go through this
// helper so background routine maintenance cannot overwrite a newer user edit.
const MOMO_FILE_MUTATION_QUEUES = new Map();

function enqueueFileMutation(path, work) {
  const key = normalizeVaultPath(path);
  const previous = MOMO_FILE_MUTATION_QUEUES.get(key) || Promise.resolve();
  const current = previous.catch(() => {}).then(work);
  let tracked;
  tracked = current.catch(() => {}).finally(() => {
    if (MOMO_FILE_MUTATION_QUEUES.get(key) === tracked) MOMO_FILE_MUTATION_QUEUES.delete(key);
  });
  MOMO_FILE_MUTATION_QUEUES.set(key, tracked);
  return current;
}

async function waitForPendingFileMutations() {
  const pending = [...MOMO_FILE_MUTATION_QUEUES.values()];
  if (pending.length) await Promise.allSettled(pending);
}

async function mutateTextFile(app, fileOrPath, transform, options={}) {
  const path = normalizeVaultPath(typeof fileOrPath === 'string' ? fileOrPath : fileOrPath?.path);
  if (!path || typeof transform !== 'function') return { changed:false, result:null, file:null };

  return enqueueFileMutation(path, async () => {
    let file = app.vault.getAbstractFileByPath(path);
    if (!file && Object.prototype.hasOwnProperty.call(options, 'createContent')) {
      const folder = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
      if (folder) {
        const parts = folder.split('/').filter(Boolean);
        let current = '';
        for (const part of parts) {
          current = current ? `${current}/${part}` : part;
          if (app.vault.getAbstractFileByPath(current)) continue;
          try { await app.vault.createFolder(current); } catch (_) {}
        }
      }
      try { file = await app.vault.create(path, String(options.createContent ?? '')); }
      catch (_) { file = app.vault.getAbstractFileByPath(path); }
    }
    if (!file) return { changed:false, result:null, file:null };

    const evaluate = currentText => {
      let localResult = null;
      const transformed = transform(String(currentText ?? ''), file);
      let nextText = transformed;
      if (transformed && typeof transformed === 'object' && Object.prototype.hasOwnProperty.call(transformed, 'text')) {
        nextText = transformed.text;
        localResult = transformed.result ?? null;
      }
      if (nextText === undefined || nextText === null) nextText = currentText;
      nextText = String(nextText);
      return { nextText, result:localResult, changed:nextText !== currentText };
    };

    // Preflight avoids touching mtime/sync state for the many routine checks that
    // are no-ops. If the file changes between this read and write, Vault.process()
    // re-evaluates the transformation against the newest contents atomically.
    const firstText = await app.vault.read(file);
    const first = evaluate(firstText);
    if (!first.changed) return { changed:false, result:first.result, file };

    let finalChanged = first.changed;
    let finalResult = first.result;
    let historyBeforeText = firstText;
    let historyAfterText = first.nextText;
    if (typeof app.vault.process === 'function') {
      await app.vault.process(file, latestText => {
        const evaluated = latestText === firstText ? first : evaluate(latestText);
        finalChanged = evaluated.changed;
        finalResult = evaluated.result;
        historyBeforeText = String(latestText ?? '');
        historyAfterText = evaluated.nextText;
        return evaluated.nextText;
      });
    } else {
      await app.vault.modify(file, first.nextText);
    }
    if (finalChanged) recordActiveUndoMutation(path, historyBeforeText, historyAfterText);
    return { changed:finalChanged, result:finalResult, file };
  });
}


let ACTIVE_LOCAL_STORAGE_NAMESPACE = 'vault';
function localStorageNamespaceFor(app) {
  const raw = String(app?.vault?.getName?.() || 'vault').trim() || 'vault';
  return encodeURIComponent(raw).replace(/%/g, '_');
}
function configureLocalStorageNamespace(app) {
  ACTIVE_LOCAL_STORAGE_NAMESPACE = localStorageNamespaceFor(app);
}
function momoScopedLocalKey(key) {
  const raw = String(key || '');
  if (!raw.startsWith('momo.todo.')) return raw;
  return `momo.todo.vault.${ACTIVE_LOCAL_STORAGE_NAMESPACE}.${raw.slice('momo.todo.'.length)}`;
}
function momoLocalGet(key) { try { return localStorage.getItem(momoScopedLocalKey(key)); } catch (_) { return null; } }
function momoLocalSet(key, value) { try { localStorage.setItem(momoScopedLocalKey(key), String(value)); return true; } catch (_) { return false; } }
function momoLocalRemove(key) { try { localStorage.removeItem(momoScopedLocalKey(key)); } catch (_) {} }

function migrateLegacyLocalStorageForVault({ claimLegacy=false }={}) {
  try {
    const markerKey = momoScopedLocalKey('momo.todo.localStorageMigration.v1');
    if (localStorage.getItem(markerKey) === '1') return;

    const claimKey = 'momo.todo.__legacyScopedClaim';
    let claimedBy = localStorage.getItem(claimKey);
    if (!claimedBy && claimLegacy) {
      claimedBy = ACTIVE_LOCAL_STORAGE_NAMESPACE;
      localStorage.setItem(claimKey, claimedBy);
    }

    if (claimedBy === ACTIVE_LOCAL_STORAGE_NAMESPACE) {
      const legacyKeys = [];
      for (let i=0; i<localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith('momo.todo.') || key.startsWith('momo.todo.vault.') || key.startsWith('momo.todo.__')) continue;
        if (/^momo\.todo\.(hideCompleted|showAllCategories|prefillCategory|monthlyCleanup\.|recentGroups\.|hiddenGroups\.|lastGroup\.)/.test(key)) legacyKeys.push(key);
      }
      for (const key of legacyKeys) {
        const value = localStorage.getItem(key);
        if (value !== null && localStorage.getItem(momoScopedLocalKey(key)) === null) {
          localStorage.setItem(momoScopedLocalKey(key), value);
        }
        localStorage.removeItem(key);
      }
    }
    localStorage.setItem(markerKey, '1');
  } catch (_) {}
}

function applyRuntimeStoragePaths(paths={}) {
  const base = paths.root ? storagePathsFromRoot(paths.root) : storagePathsFromRoot(DEFAULT_STORAGE_ROOT);
  ACTIVE_STORAGE_PATHS = {
    root:normalizeVaultPath(paths.root || base.root),
    dataFolder:normalizeVaultPath(paths.dataFolder || base.dataFolder),
    dailyFolder:normalizeVaultPath(paths.dailyFolder || base.dailyFolder),
    monthlyRecordFolder:normalizeVaultPath(paths.monthlyRecordFolder || base.monthlyRecordFolder),
    monthlyReviewFolder:normalizeVaultPath(paths.monthlyReviewFolder || base.monthlyReviewFolder),
    taskHubPath:normalizeVaultPath(paths.taskHubPath || base.taskHubPath),
    routineOverviewPath:normalizeVaultPath(paths.routineOverviewPath || base.routineOverviewPath),
    routinePath:normalizeVaultPath(paths.routinePath || base.routinePath)
  };
  DATA_FOLDER = ACTIVE_STORAGE_PATHS.dataFolder;
  DAILY_FOLDER = ACTIVE_STORAGE_PATHS.dailyFolder;
  MONTHLY_RECORD_FOLDER = ACTIVE_STORAGE_PATHS.monthlyRecordFolder;
  MONTHLY_REVIEW_FOLDER = ACTIVE_STORAGE_PATHS.monthlyReviewFolder;
  TASK_HUB_PATH = ACTIVE_STORAGE_PATHS.taskHubPath;
  ROUTINE_OVERVIEW_PATH = ACTIVE_STORAGE_PATHS.routineOverviewPath;
  ROUTINE_PATH = ACTIVE_STORAGE_PATHS.routinePath;
}

const LEGACY_DEFAULT_CATEGORIES = [
  '창작','업무','약속','생활','취미','기념일','기타'
];

const PUBLIC_DEFAULT_CATEGORIES = [
  '업무','개인','취미','생활','기타'
];

const PUBLIC_DEFAULT_GROUPS = {
  '업무':['기타'],
  '개인':['일정','약속','기타'],
  '취미':['독서','영화','음악','기타'],
  '생활':['집안일','루틴','기타'],
  '기타':['기타']
};

const PUBLIC_MINIMAL_CATEGORIES = ['업무','개인','기타'];
const PUBLIC_MINIMAL_GROUPS = {
  '업무':['기타'],
  '개인':['기타'],
  '기타':['기타']
};

const PUBLIC_BLANK_CATEGORIES = ['기타'];
const PUBLIC_BLANK_GROUPS = {
  '기타':['기타']
};

function localizedPresetData(key='default', language=ACTIVE_LANGUAGE) {
  const data = {
    ko:{default:{categories:['업무','개인','취미','생활','기타'],groups:{'업무':['기타'],'개인':['일정','약속','기타'],'취미':['독서','영화','음악','기타'],'생활':['집안일','루틴','기타'],'기타':['기타']}},minimal:{categories:['업무','개인','기타'],groups:{'업무':['기타'],'개인':['기타'],'기타':['기타']}},blank:{categories:['기타'],groups:{'기타':['기타']}}},
    en:{default:{categories:['Work','Personal','Hobbies','Life','Other'],groups:{'Work':['Other'],'Personal':['Schedule','Appointments','Other'],'Hobbies':['Reading','Movies','Music','Other'],'Life':['Chores','Routines','Other'],'Other':['Other']}},minimal:{categories:['Work','Personal','Other'],groups:{'Work':['Other'],'Personal':['Other'],'Other':['Other']}},blank:{categories:['Other'],groups:{'Other':['Other']}}},
    ja:{default:{categories:['仕事','個人','趣味','生活','その他'],groups:{'仕事':['その他'],'個人':['予定','約束','その他'],'趣味':['読書','映画','音楽','その他'],'生活':['家事','ルーティン','その他'],'その他':['その他']}},minimal:{categories:['仕事','個人','その他'],groups:{'仕事':['その他'],'個人':['その他'],'その他':['その他']}},blank:{categories:['その他'],groups:{'その他':['その他']}}},
    zh:{default:{categories:['工作','个人','兴趣','生活','其他'],groups:{'工作':['其他'],'个人':['日程','约会','其他'],'兴趣':['阅读','电影','音乐','其他'],'生活':['家务','例行任务','其他'],'其他':['其他']}},minimal:{categories:['工作','个人','其他'],groups:{'工作':['其他'],'个人':['其他'],'其他':['其他']}},blank:{categories:['其他'],groups:{'其他':['其他']}}}
  };
  return (data[language] || data.ko)[key] || (data[language] || data.ko).default;
}
function getPublicSetupPreset(key='default') {
  const localized=localizedPresetData(key);
  const meta=key==='minimal'?{title:uiText('presetMinimal'),description:uiText('presetMinimalDesc')}:key==='blank'?{title:uiText('presetDirect'),description:uiText('presetDirectDesc')}:{title:uiText('presetDefault'),description:uiText('presetDefaultDesc')};
  return {key:key==='minimal'||key==='blank'?key:'default',...meta,categories:[...localized.categories],groups:Object.fromEntries(Object.entries(localized.groups).map(([c,g])=>[c,[...g]]))};
}

const CATEGORIES = [...PUBLIC_DEFAULT_CATEGORIES];

const CATEGORY_TAGS = {
  '창작':'#창작',
  '업무':'#업무',
  '개인':'#개인',
  '약속':'#약속',
  '생활':'#생활',
  '취미':'#취미',
  '기념일':'#기념일',
  '기타':'#기타',

  // 과거 데이터 판독/마이그레이션용 alias
  '프로젝트':'#프로젝트',
  '커리어':'#커리어',
  '생활 습관':'#생활습관',
  '몸 관리':'#몸관리',
  '건강':'#건강',
  '집안일':'#집안일',
  '쇼핑':'#쇼핑',
  '생일':'#생일'
};

const TAG_TO_CATEGORY = Object.fromEntries(
  Object.entries(CATEGORY_TAGS).map(([k,v]) => [v,k])
);

const COLORS = Object.fromEntries(
  Object.keys(CATEGORY_TAGS).map(k => [k, '#8a8f98'])
);

const LEGACY_GROUP_PRESETS = Object.freeze({
  '창작':['오행','살바람','여름을 훔친 아이','기타'],
  '업무':['에픽세븐','도라셔다','커리어','기타'],
  '약속':['공적 약속','사적 약속','기타'],
  '생활':['루틴','운동','정리','쇼핑','기타'],
  '취미':['게임','독서','영화','기타'],
  '기념일':['생일','기념일','기타'],
  '기타':['기타']
});

const GROUP_PRESETS = {};

// Runtime bridge used only to persist taxonomy discoveries made while parsing
// synced/manual markdown. UI selection recency remains device-local, but the
// canonical group taxonomy is saved to plugin data so every device sees it.
let ACTIVE_MOMO_PLUGIN = null;
let GROUP_DISCOVERY_PERSIST_TIMER = null;

function recordActiveUndoMutation(path, beforeText, afterText) {
  const plugin = ACTIVE_MOMO_PLUGIN;
  if (!plugin || plugin._historyApplying || !plugin._historyTransaction) return;
  plugin.recordUndoMutation(path, beforeText, afterText);
}
function queueDiscoveredGroupPersist() {
  const plugin = ACTIVE_MOMO_PLUGIN;
  if (!plugin || plugin._taxonomyAutoPersistReady !== true) return;
  if (GROUP_DISCOVERY_PERSIST_TIMER) window.clearTimeout(GROUP_DISCOVERY_PERSIST_TIMER);
  GROUP_DISCOVERY_PERSIST_TIMER = window.setTimeout(async () => {
    GROUP_DISCOVERY_PERSIST_TIMER = null;
    const current = ACTIVE_MOMO_PLUGIN;
    if (!current || current._taxonomyAutoPersistReady !== true) return;
    try { await current.saveGroupSettings(); }
    catch (err) { console.error('Momoan Todo discovered group persist:', err); }
  }, 180);
}

const TAXONOMY_SCHEMA_VERSION = 5;
const ROUTINE_ENGINE_SCHEMA_VERSION = 7;
const ROUTINE_HISTORY_SCHEMA_VERSION = 1;
const ROUTINE_LINK_SCHEMA_VERSION = 1;



function stripMonthlyReviewFrontmatter(text='') {
  return String(text).replace(/^---\n[\s\S]*?\n---\n*/m, '');
}

function stripMonthlyReviewStats(text='') {
  return String(text).replace(/(?:<!-- momo:review-stats:start -->|%% momo:review-stats:start %%)[\s\S]*?(?:<!-- momo:review-stats:end -->|%% momo:review-stats:end %%)/g, '').trim();
}

function monthlyReviewSection(text='', heading='') {
  const cleaned = String(text);
  const re = new RegExp(`^##\\s+${escapeRegex(heading)}\\s*$`, 'm');
  const match = re.exec(cleaned);
  if (!match) return '';
  const rest = cleaned.slice(match.index + match[0].length);
  const nextIndex = rest.search(/^##\s+/m);
  return (nextIndex >= 0 ? rest.slice(0, nextIndex) : rest).trim();
}

function extractMonthlyReviewJournal(text='') {
  let cleaned = stripMonthlyReviewStats(stripMonthlyReviewFrontmatter(text));
  cleaned = cleaned.replace(/^#\s+.*?회고\s*$/m, '').trim();

  for (const heading of reviewJournalHeadings()) {
    const current = monthlyReviewSection(cleaned, heading);
    if (current) return current;
  }

  const legacy = [
    ['이번 달 잘한 점', '잘한 점'],
    ['아쉬웠던 점', '아쉬웠던 점'],
    ['다음 달에 이어갈 것', '다음 달에 이어갈 것']
  ];
  const merged = [];
  for (const [heading, label] of legacy) {
    const body = monthlyReviewSection(cleaned, heading);
    if (!body) continue;
    const values = body.split('\n')
      .map(line => line.trim().replace(/^[-*]\s*/, '').trim())
      .filter(Boolean);
    if (values.length) merged.push(`- ${label}: ${values.join(' / ')}`);
  }
  if (merged.length) return merged.join('\n');

  // Unknown/custom text is preserved as journal content instead of being discarded.
  const withoutLegacyHeadings = cleaned
    .replace(/^##\s+(이번 달 잘한 점|아쉬웠던 점|다음 달에 이어갈 것|이번 달 요약|카테고리별 완료)\s*$/gm, '')
    .trim();
  return withoutLegacyHeadings || '- ';
}

function sanitizeMonthlyReviewJournal(text='') {
  const cleaned = String(text)
    .split('\n')
    .map(line => line.replace(/\s+$/g, ''))
    .filter(line => !/^\s*(?:[-*+]\s*|\d+[.)]\s*)$/.test(line))
    .join('\n')
    .trim();
  return cleaned;
}


function getTopCountEntry(map) {
  return [...map.entries()].sort((a,b)=>b[1]-a[1] || String(a[0]).localeCompare(String(b[0]), 'ko'))[0] || null;
}

function summarizeCategoryShift(currentMap, previousMap) {
  const categoryOrder = [...new Set([
    ...CATEGORIES,
    ...currentMap.keys(),
    ...previousMap.keys()
  ])];
  const deltas = categoryOrder.map(category => ({
    category,
    delta:(currentMap.get(category) || 0) - (previousMap.get(category) || 0)
  })).filter(entry => entry.delta !== 0);
  if (!deltas.length) return { value:'-', sub:'' };

  const positive = deltas
    .filter(entry => entry.delta > 0)
    .sort((a,b)=>b.delta-a.delta || a.category.localeCompare(b.category, 'ko'))[0] || null;
  const negative = deltas
    .filter(entry => entry.delta < 0)
    .sort((a,b)=>a.delta-b.delta || a.category.localeCompare(b.category, 'ko'))[0] || null;

  if (positive && negative) {
    return { value:`${positive.category} +${positive.delta} · ${negative.category} ${negative.delta}`, sub:'' };
  }
  if (positive) return { value:`${positive.category} +${positive.delta}`, sub:'' };
  return { value:`${negative.category} ${negative.delta}`, sub:'' };
}

function buildMonthlyReviewDocument(month, stats, existingText='') {
  const journal = extractMonthlyReviewJournal(existingText).trim() || '- ';
  return `---\ntype: monthly-review\nmonth: ${month}\n---\n\n${stats}\n\n## ${uiText('reviewJournal')}\n${journal}\n`;
}

class MomoanTodoSettingsTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    const plugin = this.plugin;
    containerEl.empty();
    containerEl.addClass('momoan-todo-settings');

    containerEl.createEl('h2', { text:uiText('settingsTitle') });

    if (!this._openSections) this._openSections = new Set(['general']);
    const createSettingsSection = (id, titleKey, descKey) => {
      const details = containerEl.createEl('details', { cls:'momo-settings-disclosure' });
      details.open = this._openSections.has(id);
      details.addEventListener('toggle', () => {
        if (details.open) this._openSections.add(id);
        else this._openSections.delete(id);
      });
      const summary = details.createEl('summary', { cls:'momo-settings-disclosure-summary' });
      const copy = summary.createDiv({ cls:'momo-settings-disclosure-copy' });
      copy.createDiv({ text:uiText(titleKey), cls:'momo-settings-disclosure-title' });
      copy.createDiv({ text:uiText(descKey), cls:'momo-settings-disclosure-desc' });
      const body = details.createDiv({ cls:'momo-settings-disclosure-body' });
      return body;
    };

    const generalSection = createSettingsSection('general', 'settingsSectionGeneral', 'settingsSectionGeneralDesc');
    const calendarSection = createSettingsSection('calendar', 'settingsSectionCalendar', 'settingsSectionCalendarDesc');
    const sortSection = createSettingsSection('sort', 'autoSortSettings', 'autoSortSettingsDesc');
    const storageSection = createSettingsSection('storage', 'settingsSectionStorage', 'settingsSectionStorageDesc');
    const recoverySection = createSettingsSection('recovery', 'settingsSectionRecovery', 'settingsSectionRecoveryDesc');

    const basisSetting = new Setting(generalSection)
      .setName(uiText('displayBasis'))
      .setDesc(uiText('displayBasisDesc'));
    basisSetting.descEl.style.whiteSpace = 'pre-line';
    basisSetting.addButton(button => button
      .setButtonText(uiText('openAppearance'))
      .onClick(() => {
        try {
          this.app.setting?.openTabById?.('appearance');
        } catch (error) { console.error('Momoan Todo appearance settings:', error); }
      }));

    new Setting(generalSection)
      .setName(uiText('startScreen'))
      .setDesc(uiText('startScreenDesc'))
      .addButton(button => button
        .setButtonText(uiText('open'))
        .onClick(() => plugin.openStartGuideFromSettings()));

    const currentStorageSetting = new Setting(storageSection)
      .setName(uiText('currentStorage'));
    currentStorageSetting.controlEl.createDiv({
      text:ACTIVE_STORAGE_PATHS.root || DEFAULT_STORAGE_ROOT,
      cls:'momo-current-storage-path',
      attr:{'aria-label':uiText('currentStorageValue')}
    });

    let connectDraft = ACTIVE_STORAGE_PATHS.root || DEFAULT_STORAGE_ROOT;
    const connectSetting = new Setting(storageSection)
      .setName(uiText('connectStorage'))
      .setDesc(uiText('connectStorageDesc'));
    connectSetting.addText(input => {
      input.setValue(connectDraft);
      input.onChange(value => { connectDraft = value; });
      input.inputEl.style.minWidth = '260px';
    });
    connectSetting.addButton(button => button
      .setButtonText(uiText('connect'))
      .onClick(async () => {
        const nextRoot = normalizeVaultPath(connectDraft);
        if (!nextRoot) return new Notice(uiText('invalidFolder'));
        if (!window.confirm(uiText('connectConfirm'))) return;
        button.setDisabled(true);
        try {
          await plugin.connectExistingStorage(nextRoot);
          connectDraft = ACTIVE_STORAGE_PATHS.root;
          new Notice(uiText('connectStorageDone'));
          this.display();
        } catch (error) {
          console.error('Momoan Todo storage connect:', error);
          new Notice(error?.message || uiText('connectStorageInvalid'));
          button.setDisabled(false);
        }
      }));

    let storageDraft = ACTIVE_STORAGE_PATHS.root || DEFAULT_STORAGE_ROOT;
    const storageSetting = new Setting(storageSection)
      .setName(uiText('storageFolder'))
      .setDesc(uiText('storageFolderDesc'));
    storageSetting.addText(input => {
      input.setValue(storageDraft);
      input.onChange(value => { storageDraft = value; });
      input.inputEl.style.minWidth = '260px';
    });
    storageSetting.addButton(button => button
      .setButtonText(uiText('move'))
      .onClick(async () => {
        const nextRoot = normalizeVaultPath(storageDraft);
        if (!nextRoot) return new Notice(uiText('invalidFolder'));
        if (nextRoot === ACTIVE_STORAGE_PATHS.root) return new Notice(uiText('moveStorageSame'));
        if (!window.confirm(uiText('moveConfirm'))) return;
        button.setDisabled(true);
        try {
          await plugin.moveStorageRoot(nextRoot);
          storageDraft = ACTIVE_STORAGE_PATHS.root;
          new Notice(uiText('moveStorageDone'));
          this.display();
        } catch (error) {
          console.error('Momoan Todo storage move:', error);
          new Notice(error?.message || String(error));
          button.setDisabled(false);
        }
      }));

    new Setting(recoverySection)
      .setName(uiText('recoverySnapshot'))
      .setDesc(uiText('recoverySnapshotDesc'))
      .addButton(button => button
        .setButtonText(uiText('exportSnapshot'))
        .onClick(async () => {
          button.setDisabled(true);
          try {
            await plugin.exportRecoverySnapshot();
            new Notice(uiText('snapshotExported'));
          } catch (error) {
            console.error('Momoan Todo recovery snapshot export:', error);
            new Notice(error?.message || String(error));
          } finally {
            button.setDisabled(false);
          }
        }))
      .addButton(button => button
        .setButtonText(uiText('restoreLatestSnapshot'))
        .onClick(async () => {
          if (!window.confirm(uiText('snapshotRestoreConfirm'))) return;
          button.setDisabled(true);
          try {
            await plugin.restoreLatestRecoverySnapshot();
            new Notice(uiText('snapshotRestored'));
          } catch (error) {
            console.error('Momoan Todo recovery snapshot restore:', error);
            new Notice(error?.message || String(error));
          } finally {
            button.setDisabled(false);
          }
        }));

    new Setting(recoverySection)
      .setName(uiText('autoSafetyBackup'))
      .setDesc(uiText('autoSafetyBackupDesc'))
      .addButton(button => button
        .setButtonText(uiText('restoreAutoBackup'))
        .onClick(async () => {
          if (!window.confirm(uiText('autoBackupRestoreConfirm'))) return;
          button.setDisabled(true);
          try {
            await plugin.restoreLatestAutoSafetyBackup();
            new Notice(uiText('autoBackupRestored'));
          } catch (error) {
            console.error('Momoan Todo automatic safety backup restore:', error);
            new Notice(error?.message || String(error));
          } finally {
            button.setDisabled(false);
          }
        }));

    let autoSortPresetDropdown = null;
    const markAutoSortCustom = () => {
      plugin.generalSettings.autoSortPreset = 'custom';
      autoSortPresetDropdown?.setValue?.('custom');
    };
    const saveAutoSort = async () => {
      await plugin.saveCategorySettings();
      plugin.refreshViews();
    };

    new Setting(sortSection)
      .setName(uiText('autoSortPreset'))
      .setDesc(uiText('autoSortPresetDesc'))
      .addDropdown(dropdown => {
        autoSortPresetDropdown = dropdown;
        dropdown
          .addOption('quick', uiText('sortPresetQuick'))
          .addOption('time', uiText('sortPresetTime'))
          .addOption('manual', uiText('sortPresetManual'))
          .addOption('custom', uiText('sortPresetCustom'))
          .setValue(normalizeAutoSortPreset(plugin.generalSettings?.autoSortPreset || 'quick'))
          .onChange(async value => {
            if (value === 'custom') {
              plugin.generalSettings.autoSortPreset = 'custom';
            } else {
              applyAutoSortPreset(plugin.generalSettings, value);
            }
            await saveAutoSort();
            this.display();
          });
      });

    const addAutoSortPrioritySetting = (index, labelKey) => {
      new Setting(sortSection)
        .setName(uiText(labelKey))
        .addDropdown(dropdown => dropdown
          .addOption('time', uiText('sortCriterionTime'))
          .addOption('titleLength', uiText('sortCriterionTitleLength'))
          .addOption('alphabet', uiText('sortCriterionAlphabet'))
          .addOption('manual', uiText('sortCriterionManual'))
          .setValue(normalizeAutoSortPriorities(plugin.generalSettings?.autoSortPriorities)[index])
          .onChange(async value => {
            const priorities = normalizeAutoSortPriorities(plugin.generalSettings?.autoSortPriorities);
            priorities[index] = normalizeAutoSortCriterion(value, priorities[index]);
            plugin.generalSettings.autoSortPriorities = priorities;
            markAutoSortCustom();
            await saveAutoSort();
          }));
    };
    addAutoSortPrioritySetting(0, 'autoSortPriority1');
    addAutoSortPrioritySetting(1, 'autoSortPriority2');
    addAutoSortPrioritySetting(2, 'autoSortPriority3');

    new Setting(sortSection)
      .setName(uiText('autoSortTimedPlacement'))
      .setDesc(uiText('autoSortTimedPlacementDesc'))
      .addDropdown(dropdown => dropdown
        .addOption('first', uiText('sortTimedFirst'))
        .addOption('last', uiText('sortTimedLast'))
        .setValue(normalizeAutoSortTimedPlacement(plugin.generalSettings?.autoSortTimedPlacement))
        .onChange(async value => {
          plugin.generalSettings.autoSortTimedPlacement = normalizeAutoSortTimedPlacement(value);
          markAutoSortCustom();
          await saveAutoSort();
        }));

    new Setting(sortSection)
      .setName(uiText('autoSortCompletedPlacement'))
      .setDesc(uiText('autoSortCompletedPlacementDesc'))
      .addDropdown(dropdown => dropdown
        .addOption('mixed', uiText('sortCompletedMixed'))
        .addOption('bottom', uiText('sortCompletedBottom'))
        .setValue(normalizeAutoSortCompletedPlacement(plugin.generalSettings?.autoSortCompletedPlacement))
        .onChange(async value => {
          plugin.generalSettings.autoSortCompletedPlacement = normalizeAutoSortCompletedPlacement(value);
          markAutoSortCustom();
          await saveAutoSort();
        }));

    new Setting(sortSection)
      .setName(uiText('autoSortRoutinePlacement'))
      .setDesc(uiText('autoSortRoutinePlacementDesc'))
      .addDropdown(dropdown => dropdown
        .addOption('mixed', uiText('sortRoutineMixed'))
        .addOption('generalFirst', uiText('sortGeneralFirst'))
        .addOption('routineFirst', uiText('sortRoutineFirst'))
        .setValue(normalizeAutoSortRoutinePlacement(plugin.generalSettings?.autoSortRoutinePlacement))
        .onChange(async value => {
          plugin.generalSettings.autoSortRoutinePlacement = normalizeAutoSortRoutinePlacement(value);
          markAutoSortCustom();
          await saveAutoSort();
        }))
      .addButton(button => button
        .setButtonText(uiText('autoSortReset'))
        .onClick(async () => {
          applyAutoSortPreset(plugin.generalSettings, 'quick');
          await saveAutoSort();
          this.display();
        }));

    new Setting(calendarSection)
      .setName(uiText('weekStart'))
      .setDesc(uiText('weekStartDesc'))
      .addDropdown(dropdown => dropdown
        .addOption('monday', uiText('monday'))
        .addOption('sunday', uiText('sunday'))
        .setValue(plugin.generalSettings?.weekStart || 'monday')
        .onChange(async value => {
          plugin.generalSettings.weekStart = normalizeWeekStart(value);
          ACTIVE_WEEK_START = plugin.generalSettings.weekStart;
          await plugin.saveCategorySettings();
          plugin.refreshViews();
        }));


    new Setting(calendarSection)
      .setName(uiText('holidayRegion'))
      .setDesc(uiText('holidayRegionDesc'))
      .addDropdown(dropdown => dropdown
        .addOption('none', uiText('holidayNone'))
        .addOption('kr', uiText('holidayKR'))
        .addOption('us', uiText('holidayUS'))
        .addOption('jp', uiText('holidayJP'))
        .addOption('cn', uiText('holidayCN'))
        .setValue(plugin.generalSettings?.holidayRegion || 'none')
        .onChange(async value => {
          plugin.generalSettings.holidayRegion = normalizeHolidayRegion(value);
          await plugin.saveCategorySettings();
          plugin.refreshViews();
        }));

    new Setting(calendarSection)
      .setName(uiText('weekendColors'))
      .setDesc(uiText('weekendColorsDesc'))
      .addToggle(toggle => toggle
        .setValue(plugin.generalSettings?.weekendColorsEnabled !== false)
        .onChange(async value => {
          plugin.generalSettings.weekendColorsEnabled = Boolean(value);
          await plugin.saveCategorySettings();
          plugin.refreshViews();
        }));

    new Setting(calendarSection)
      .setName(uiText('customHolidays'))
      .setDesc(uiText('customHolidaysDesc'))
      .addText(input => {
        input
          .setPlaceholder(uiText('customHolidayPlaceholder'))
          .setValue(plugin.generalSettings?.customHolidays || '')
          .onChange(async value => {
            plugin.generalSettings.customHolidays = String(value || '');
            await plugin.saveCategorySettings();
            plugin.refreshViews();
          });
        input.inputEl.style.minWidth = '320px';
      });

    new Setting(generalSection)
      .setName(uiText('accentColor'))
      .setDesc(uiText('accentColorDesc'))
      .addColorPicker(picker => picker
        .setValue(plugin.generalSettings?.accentColor || DEFAULT_ACCENT_COLOR)
        .onChange(async value => {
          plugin.generalSettings.accentColor = value || DEFAULT_ACCENT_COLOR;
          plugin.applyAccentSetting();
          await plugin.saveCategorySettings();
          plugin.refreshViews();
        }))
      .addButton(button => button
        .setButtonText(uiText('reset'))
        .onClick(async () => {
          plugin.generalSettings.accentColor = DEFAULT_ACCENT_COLOR;
          plugin.applyAccentSetting();
          await plugin.saveCategorySettings();
          plugin.refreshViews();
          this.display();
        }));

    new Setting(calendarSection)
      .setName(uiText('monthlyReview'))
      .setDesc(uiText('monthlyReviewDesc'))
      .addToggle(toggle => toggle
        .setValue(plugin.generalSettings?.monthlyReviewEnabled !== false)
        .onChange(async value => {
          plugin.generalSettings.monthlyReviewEnabled = Boolean(value);
          await plugin.saveCategorySettings();
          plugin.refreshViews();
        }));

    new Setting(calendarSection)
      .setName(uiText('monthCount'))
      .setDesc(uiText('monthCountDesc'))
      .addToggle(toggle => toggle
        .setValue(plugin.generalSettings?.showMonthCount !== false)
        .onChange(async value => {
          plugin.generalSettings.showMonthCount = Boolean(value);
          await plugin.saveCategorySettings();
          plugin.refreshViews();
        }));

    new Setting(calendarSection)
      .setName(uiText('monthPercent'))
      .setDesc(uiText('monthPercentDesc'))
      .addToggle(toggle => toggle
        .setValue(plugin.generalSettings?.showMonthPercent !== false)
        .onChange(async value => {
          plugin.generalSettings.showMonthPercent = Boolean(value);
          await plugin.saveCategorySettings();
          plugin.refreshViews();
        }));

    new Setting(generalSection)
      .setName(uiText('hour24'))
      .setDesc(uiText('hour24Desc'))
      .addToggle(toggle => toggle
        .setValue(plugin.generalSettings?.use24Hour !== false)
        .onChange(async value => {
          plugin.generalSettings.use24Hour = Boolean(value);
          ACTIVE_USE_24_HOUR = plugin.generalSettings.use24Hour;
          await plugin.saveCategorySettings();
          plugin.refreshViews();
        }));

    new Setting(generalSection)
      .setName(uiText('language'))
      .setDesc(uiText('languageDesc'))
      .addDropdown(dropdown => dropdown
        .addOption('ko', uiText('korean'))
        .addOption('en', uiText('english'))
        .addOption('ja', uiText('japanese'))
        .addOption('zh', uiText('chinese'))
        .setValue(plugin.generalSettings?.language || 'ko')
        .onChange(async value => {
          plugin.generalSettings.language = normalizeLanguage(value);
          ACTIVE_LANGUAGE = plugin.generalSettings.language;
          await plugin.saveCategorySettings();
          plugin.refreshViews();
          this.display();
        }));

  }
}

module.exports = class MomoanTodoPlugin extends Plugin {
  async onload() {
    ACTIVE_MOMO_PLUGIN = this;
    configureLocalStorageNamespace(this.app);
    this._taxonomyAutoPersistReady = false;
    this.selectedDate = todaySeoul();
    this.lastRoutineRollDate = todaySeoul();
    // v0.9.57: undo/redo history is deliberately session-local. Persisting it
    // across devices would make stale history capable of overwriting synced data.
    this.undoStack = [];
    this.redoStack = [];
    this._historyTransaction = null;
    this._historyApplying = false;
    this._historyLimit = 30;
    // v0.9.43: focus/15-minute checks are cheap unless routine-relevant Vault
    // data actually changed. Revisions prevent a sync event that arrives during
    // a scan from being accidentally acknowledged by an older pass.
    this._routineIntegrityRevision = 0;
    this._routineIntegrityCheckedRevision = 0;
    this.monthCache = new Map();
    const saved = await this.loadData().catch(() => ({})) || {};

    // Legacy Momoan Vault evidence always wins over beta onboarding state.
    // v0.8.2~0.8.6 could accidentally mark an existing personal Vault as a
    // fresh/public install; recover the historical storage/taxonomy before any
    // first-run detection so existing data is never hidden behind onboarding.
    this.hasLegacyVaultEvidence = this.detectLegacyVaultEvidence(saved) || await this.detectLegacyTaskContent(saved);
    this.legacyTaxonomyRepaired = this.hasLegacyVaultEvidence
      ? this.forceLegacyVaultState(saved)
      : this.repairLegacyTaxonomyState(saved);

    const contaminatedFreshState = !this.hasLegacyVaultEvidence && this.detectContaminatedFreshState(saved);
    // Genuine fresh installs get the guided first-run flow. Existing/synced Vaults
    // remain untouched and can replay the guide from Settings without setup.
    this.firstRunPending = this.detectFreshInstall(saved);
    this.setupSuggested = this.firstRunPending;
    this.firstRunModalOpen = false;
    this.isLegacyInstall = this.hasLegacyVaultEvidence || this.detectLegacyInstall(saved);
    this.installProfile = this.isLegacyInstall ? 'legacy-migrated' : (saved.installProfile || 'public');
    this.needsLegacyTaxonomyMigration = this.isLegacyInstall && Number(saved.taxonomySchemaVersion || 0) < TAXONOMY_SCHEMA_VERSION;

    // v0.9.36: claim legacy unscoped UI state only for the real legacy Vault,
    // then keep every localStorage preference isolated by Vault name.
    migrateLegacyLocalStorageForVault({ claimLegacy:this.hasLegacyVaultEvidence });

    const savedStorage = Number(saved.settingsSchemaVersion || 0) >= SETTINGS_SCHEMA_VERSION && saved.storage
      ? saved.storage
      : (this.isLegacyInstall ? LEGACY_STORAGE_PATHS : storagePathsFromRoot(DEFAULT_STORAGE_ROOT));
    applyRuntimeStoragePaths(savedStorage);
    this.storageSettings = { ...ACTIVE_STORAGE_PATHS };
    const savedGeneral = saved?.general || saved?.settings?.general || {};
    this.generalSettings = {
      weekStart:normalizeWeekStart(savedGeneral.weekStart || 'monday'),
      accentColor:String(savedGeneral.accentColor || DEFAULT_ACCENT_COLOR),
      monthlyReviewEnabled:savedGeneral.monthlyReviewEnabled !== false,
      showMonthCount:savedGeneral.showMonthCount !== false,
      showMonthPercent:savedGeneral.showMonthPercent !== false,
      use24Hour:savedGeneral.use24Hour !== false,
      language:normalizeLanguage(savedGeneral.language || 'ko'),
      holidayRegion:normalizeHolidayRegion(savedGeneral.holidayRegion || defaultHolidayRegionForLanguage(savedGeneral.language || 'ko')),
      weekendColorsEnabled:savedGeneral.weekendColorsEnabled !== false,
      customHolidays:String(savedGeneral.customHolidays || ''),
      autoSortPreset:normalizeAutoSortPreset(savedGeneral.autoSortPreset || 'quick'),
      autoSortPriorities:normalizeAutoSortPriorities(savedGeneral.autoSortPriorities),
      autoSortTimedPlacement:normalizeAutoSortTimedPlacement(savedGeneral.autoSortTimedPlacement),
      autoSortCompletedPlacement:normalizeAutoSortCompletedPlacement(savedGeneral.autoSortCompletedPlacement),
      autoSortRoutinePlacement:normalizeAutoSortRoutinePlacement(savedGeneral.autoSortRoutinePlacement)
    };
    ACTIVE_WEEK_START = this.generalSettings.weekStart;
    ACTIVE_LANGUAGE = this.generalSettings.language;
    ACTIVE_USE_24_HOUR = this.generalSettings.use24Hour !== false;
    this.applyAccentSetting();

    const structuredTaxonomy = !this.firstRunPending && saved.taxonomy && Array.isArray(saved.taxonomy.categories)
      ? saved.taxonomy.categories
      : null;
    const taxonomyReady = Number(saved.taxonomySchemaVersion || 0) >= TAXONOMY_SCHEMA_VERSION;

    // Clear mutable runtime presets before rebuilding them from the canonical settings source.
    for (const key of Object.keys(GROUP_PRESETS)) delete GROUP_PRESETS[key];

    if (structuredTaxonomy?.length) {
      const names = structuredTaxonomy
        .map(entry => normalizeCategoryName(entry?.name))
        .filter(Boolean);
      if (!names.includes('기타')) names.push('기타');
      CATEGORIES.splice(0, CATEGORIES.length, ...new Set(names));

      for (const entry of structuredTaxonomy) {
        const category = normalizeCategoryName(entry?.name);
        if (!category) continue;
        if (entry.tag) CATEGORY_TAGS[category] = String(entry.tag);
        const groups = Array.isArray(entry.groups)
          ? entry.groups.map(group => normalizeCategoryName(group?.name)).filter(Boolean)
          : [];
        GROUP_PRESETS[category] = groups;
      }
    } else if (this.isLegacyInstall) {
      if (taxonomyReady && Array.isArray(saved.categories) && saved.categories.length) {
        const next = [...new Set(saved.categories.map(x => String(x || '').trim()).filter(Boolean))];
        if (!next.includes('기타')) next.push('기타');
        CATEGORIES.splice(0, CATEGORIES.length, ...next);
      } else {
        CATEGORIES.splice(0, CATEGORIES.length, ...LEGACY_DEFAULT_CATEGORIES);
      }

      if (saved.categoryTags && typeof saved.categoryTags === 'object') {
        Object.assign(CATEGORY_TAGS, saved.categoryTags);
      }

      if (taxonomyReady && saved.groups && typeof saved.groups === 'object') {
        for (const category of CATEGORIES) {
          const groups = saved.groups[category];
          if (!Array.isArray(groups)) continue;
          GROUP_PRESETS[category] = [...new Set(groups.map(x => normalizeCategoryName(x)).filter(Boolean))];
        }
      } else {
        for (const category of CATEGORIES) {
          GROUP_PRESETS[category] = [...(PUBLIC_DEFAULT_GROUPS[category] || [])];
        }
        // Pre-v0.8 Momoan installs use the historical personal presets until the
        // existing taxonomy migration finishes.
        for (const [category, groups] of Object.entries(LEGACY_GROUP_PRESETS)) {
          GROUP_PRESETS[category] = [...groups];
        }
      }
    } else {
      CATEGORIES.splice(0, CATEGORIES.length, ...PUBLIC_DEFAULT_CATEGORIES);
      for (const category of CATEGORIES) {
        GROUP_PRESETS[category] = [...(PUBLIC_DEFAULT_GROUPS[category] || ['기타'])];
      }
    }

    // Rebuild tag reverse lookup only from the configured taxonomy. Legacy/static
    // aliases must never resurrect a category that the user already renamed.
    for (const key of Object.keys(TAG_TO_CATEGORY)) delete TAG_TO_CATEGORY[key];
    for (const category of CATEGORIES) {
      ensureCategoryRuntime(category);
      TAG_TO_CATEGORY[CATEGORY_TAGS[category]] = category;
      const groups = (GROUP_PRESETS[category] || []).filter(x => x && x !== '그룹 없음' && x !== '기타');
      GROUP_PRESETS[category] = [...new Set(groups), '기타'];
    }

    if (structuredTaxonomy?.length) {
      this.inactiveCategories = new Set(
        structuredTaxonomy
          .filter(entry => entry?.inactive && entry?.name !== '기타')
          .map(entry => normalizeCategoryName(entry.name))
          .filter(name => CATEGORIES.includes(name))
      );
      this.inactiveGroups = {};
      for (const entry of structuredTaxonomy) {
        const category = normalizeCategoryName(entry?.name);
        if (!category || !Array.isArray(entry.groups)) continue;
        this.inactiveGroups[category] = new Set(
          entry.groups
            .filter(group => group?.inactive && group?.name !== '기타')
            .map(group => normalizeCategoryName(group.name))
            .filter(Boolean)
        );
      }
    } else {
      this.inactiveCategories = new Set(
        Array.isArray(saved.inactiveCategories)
          ? saved.inactiveCategories.map(x => String(x || '').trim()).filter(x => CATEGORIES.includes(x) && x !== '기타')
          : []
      );
      this.inactiveGroups = {};
      if (saved.inactiveGroups && typeof saved.inactiveGroups === 'object') {
        for (const [category, groups] of Object.entries(saved.inactiveGroups)) {
          if (!Array.isArray(groups)) continue;
          this.inactiveGroups[category] = new Set(
            groups.map(x => String(x || '').trim()).filter(x => x && x !== '기타' && x !== '그룹 없음')
          );
        }
      }
    }

    this.loadTaxonomyIdentities(saved);

    try { this.hideCompleted = momoLocalGet('momo.todo.hideCompleted') === '1'; } catch (_) { this.hideCompleted = false; }
    try { this.showAllCategories = momoLocalGet('momo.todo.showAllCategories') === '1'; } catch (_) { this.showAllCategories = false; }
    // 예전 '비밀' 그룹 흔적은 더 이상 선택/표시에 사용하지 않는다.
    try {
      for (const key of ['momo.todo.recentGroups.생활 습관','momo.todo.hiddenGroups.생활 습관']) {
        const values = JSON.parse(momoLocalGet(key) || '[]');
        if (Array.isArray(values)) momoLocalSet(key, JSON.stringify(values.filter(x => x !== '비밀')));
      }
      if (momoLocalGet('momo.todo.lastGroup.생활 습관') === '비밀') {
        momoLocalSet('momo.todo.lastGroup.생활 습관', '__none__');
      }
    } catch (_) {}
    this.uiStyle = document.createElement('style');
    this.uiStyle.id = 'momoan-todo-ui-polish';
    this.uiStyle.textContent = `
      .momoan-todo-view .momo-td-shell{gap:24px;max-width:864px;grid-template-columns:minmax(270px,320px) minmax(420px,520px);}
      .momoan-todo-view .momo-td-calendar-panel{padding-top:2px;}
      .momoan-todo-view .momo-td-cal-head h2{font-size:1.05rem;font-weight:650;letter-spacing:-.02em;}
      .momoan-todo-view .momo-td-weekdays{opacity:.52;font-size:.76rem;font-weight:600;}
      .momoan-todo-view .momo-td-day{border-radius:10px;transition:background-color .15s ease,transform .15s ease;}
      .momoan-todo-view .momo-td-day:not(.is-empty):hover{background:var(--background-modifier-hover);transform:translateY(-1px);}
      .momoan-todo-view .momo-td-day-number{font-size:.84rem;font-weight:540;}
      .momoan-todo-view .momo-td-day-count{min-width:17px;height:17px;padding:0 4px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;background:var(--background-modifier-hover);font-size:.66rem;font-weight:650;opacity:.78;}
      .momoan-todo-view .momo-td-day-dot{width:5px;height:5px;opacity:.72;}
      .momoan-todo-view .momo-td-month-summary{margin-top:22px;padding-top:15px;border-top:1px solid var(--background-modifier-border);display:flex;align-items:baseline;gap:6px;}
      .momoan-todo-view .momo-td-month-summary-number{font-size:1.45rem;font-weight:720;letter-spacing:-.04em;}
      .momoan-todo-view .momo-td-month-summary-text{font-size:.78rem;opacity:.52;font-weight:560;}
      .momoan-todo-view .momo-td-month-category-summary{margin-top:10px;gap:5px;}
      .momoan-todo-view .momo-td-month-cat-stat{min-height:22px;font-size:.76rem;}
      .momoan-todo-view .momo-td-month-cat-name{opacity:.62;}
      .momoan-todo-view .momo-td-month-cat-count{font-weight:650;opacity:.78;}
      .momoan-todo-view .momo-td-cal-foot{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:18px;}
      .momoan-todo-view .momo-td-cal-foot .momo-td-foot-btn{height:34px;border-radius:10px;border:1px solid var(--background-modifier-border);background:transparent;box-shadow:none;font-size:.78rem;font-weight:570;opacity:.78;transition:background-color .15s ease,opacity .15s ease,transform .15s ease;}
      .momoan-todo-view .momo-td-cal-foot .momo-td-foot-btn:hover{background:var(--background-modifier-hover);opacity:1;transform:translateY(-1px);}
      .momoan-todo-view .momo-td-cal-foot .momo-td-foot-btn.is-primary{background:var(--interactive-accent);color:var(--text-on-accent);border-color:transparent;opacity:.9;}
      .momoan-todo-view .momo-td-task-panel{padding:4px 20px 40px 28px;}
      .momoan-todo-view .momo-td-task-head{margin-bottom:24px;}
      .momoan-todo-view .momo-td-title-wrap h2{font-size:1.7rem;line-height:1.15;font-weight:730;letter-spacing:-.045em;margin-bottom:7px;}
      .momoan-todo-view .momo-td-task-kicker{font-size:.79rem;color:var(--text-muted);opacity:.78;font-weight:600;}
      .momoan-todo-view .momo-td-main-add{width:34px;height:34px;border-radius:50%;font-size:1.2rem;display:flex;align-items:center;justify-content:center;}
      .momoan-todo-view .momo-td-category{margin-bottom:25px;}
      .momoan-todo-view .momo-td-cat-head{margin-bottom:10px;}
      .momoan-todo-view .momo-td-cat-name{display:inline-flex;align-items:center;gap:7px;padding:4px 10px 4px 8px;border-radius:999px;background:color-mix(in srgb,var(--cat) 13%,transparent);font-size:.78rem;font-weight:650;letter-spacing:-.01em;}
      .momoan-todo-view .momo-td-dot{width:7px;height:7px;}
      .momoan-todo-view .momo-td-count{font-size:.7rem;opacity:.42;font-weight:600;}
      .momoan-todo-view .momo-td-cat-actions button{opacity:.45;border:0;background:transparent;box-shadow:none;transition:opacity .15s ease;}
      .momoan-todo-view .momo-td-cat-actions button:hover{opacity:1;}
      .momoan-todo-view .momo-td-group{margin-top:9px;}
      .momoan-todo-view .momo-td-group-head{margin:11px 0 4px 30px;}
      .momoan-todo-view .momo-td-group-title{font-size:.72rem;font-weight:560;opacity:.38;letter-spacing:-.01em;}
      .momoan-todo-view .momo-td-item{min-height:35px;border-radius:9px;padding:4px 7px;gap:7px;transition:opacity .16s ease,background-color .16s ease,transform .16s ease;}
      .momoan-todo-view .momo-td-item:hover{background:var(--background-modifier-hover);}
      .momoan-todo-view .momo-td-item input[type=checkbox]{transition:transform .14s ease,opacity .14s ease;}
      .momoan-todo-view .momo-td-item input[type=checkbox]:active{transform:scale(.88);}
      .momoan-todo-view .momo-td-item-title{font-size:.88rem;line-height:1.35;}
      .momoan-todo-view .momo-td-time{font-size:.73rem;font-weight:600;color:var(--text-muted);opacity:.68;font-variant-numeric:tabular-nums;min-width:30px;margin-right:0;}
      .momoan-todo-view .momo-td-location{font-size:.7rem;opacity:.38;}
      .momoan-todo-view .momo-td-item.is-done{opacity:.38;}
      .momoan-todo-view .momo-td-item.is-done:hover{opacity:.55;}
      .momoan-todo-view .momo-td-empty{min-height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:8px;opacity:.62;}
      .momoan-todo-view .momo-td-empty-icon{width:34px;height:34px;display:flex;align-items:center;justify-content:center;opacity:.34;margin-bottom:2px;}
      .momoan-todo-view .momo-td-empty-icon svg{width:28px;height:28px;}
      .momoan-todo-view .momo-td-empty-title{font-size:.88rem;font-weight:620;opacity:.8;}
      .momoan-todo-view .momo-td-empty-sub{font-size:.72rem;opacity:.52;}
      .momoan-todo-view .momo-td-empty button{margin-top:5px;border-radius:999px;box-shadow:none;}
      @media (max-width:720px){
        .momoan-todo-view{overflow-x:hidden!important;}
        .momoan-todo-view .momo-td-shell{display:block!important;max-width:none!important;width:100%!important;min-width:0!important;}
        .momoan-todo-view .momo-td-calendar-panel,.momoan-todo-view .momo-td-task-panel{border:0!important;padding:18px 18px 96px!important;background:var(--background-primary)!important;min-width:0!important;width:100%!important;box-sizing:border-box!important;}
        .momoan-todo-view .momo-td-calendar-panel{padding-top:12px!important;}
        .momoan-todo-view .momo-td-month-grid .momo-td-day{min-height:46px!important;}
        .momoan-todo-view .momo-td-day-number{font-size:.9rem!important;}
        .momoan-todo-view .momo-td-month-summary{margin-top:16px!important;padding-top:12px!important;}
        .momoan-todo-view .momo-td-month-summary-number{font-size:1rem!important;}
        .momoan-todo-view .momo-td-month-summary-text,.momoan-todo-view .momo-td-month-summary-rate{font-size:.72rem!important;opacity:.62;}
        .momoan-todo-view .momo-td-month-category-summary{display:none!important;}
        .momoan-todo-view .momo-td-cal-foot{grid-template-columns:repeat(3,minmax(0,1fr))!important;margin-top:16px!important;}
        .momoan-todo-view .momo-td-task-head{margin-bottom:20px!important;}
        .momoan-todo-view .momo-td-task-kicker{font-size:.78rem!important;margin-top:0!important;}
        .momoan-todo-view .momo-td-main-add{width:40px!important;height:40px!important;}
        .momoan-todo-view .momo-td-body{max-width:none!important;width:100%!important;}
        .momoan-todo-view .momo-td-category{margin-bottom:26px!important;}
        .momoan-todo-view .momo-td-item{min-height:44px!important;padding:6px 4px!important;gap:9px!important;}
        .momoan-todo-view .momo-td-item-title{font-size:.96rem!important;}
        .momoan-todo-view .momo-td-time{font-size:.82rem!important;min-width:38px!important;}
        .momoan-todo-view .momo-td-group-head{margin-left:38px!important;}
        .momoan-todo-view .momo-td-group-title{font-size:.74rem!important;}
        .momoan-todo-view .momo-td-cat-name{font-size:.83rem!important;}
      }


      .momoan-todo-view .momo-td-cal-foot{grid-template-columns:repeat(3,minmax(0,1fr));}
      .momoan-todo-view .momo-td-foot-btn{min-width:0;}
    `;
    document.head.appendChild(this.uiStyle);

    // Persist the new v0.8 settings/taxonomy identity layer immediately. Existing
    // users keep their current paths and names; fresh installs receive public-safe
    // defaults under `Momoan Todo/`.
    if (this.isLegacyInstall && this.hasLegacyVaultEvidence) {
      await this.saveCategorySettings({
        settingsSchemaVersion:SETTINGS_SCHEMA_VERSION,
        storageSchemaVersion:1,
        taxonomyIdSchemaVersion:TAXONOMY_ID_SCHEMA_VERSION,
        taxonomySchemaVersion:TAXONOMY_SCHEMA_VERSION,
        categorySchemaVersion:TAXONOMY_SCHEMA_VERSION,
        onboardingCompleted:true,
        onboardingVersion:ONBOARDING_SCHEMA_VERSION,
        installProfile:'legacy-migrated',
        legacyTaxonomyRescueVersion:LEGACY_TAXONOMY_RESCUE_VERSION
      }).catch(err => console.error('Momoan Todo 기존 Vault 분류 복구:', err));
    } else if (!this.firstRunPending) {
      await this.persistV08SettingsMigration(saved).catch(err =>
        console.error('Momoan Todo v0.8 설정 마이그레이션:', err)
      );
    }

    this.registerView(VIEW_TYPE, leaf => new MomoTodoMateView(leaf, this));

    // iOS Shortcuts / widgets can open the Todo view directly with
    // obsidian://momoan-todo (optionally add ?vault=<vault-name> so Obsidian
    // routes the URI to a specific vault before invoking this handler).
    this.registerObsidianProtocolHandler('momoan-todo', async () => {
      await this.activateView();
    });

    this.addRibbonIcon('list-checks', '투두리스트', () => this.activateView());
    this.addSettingTab(new MomoanTodoSettingsTab(this.app, this));

    this.addCommand({
      id:'open-momo-todomate', name:'투두리스트 열기',
      callback:()=>this.activateView()
    });
    this.addCommand({
      id:'momo-todomate-today', name:'투두리스트 · 오늘로 이동',
      callback:()=>this.setSelectedDate(todaySeoul())
    });

    this.addCommand({
      id:'momo-todomate-routines', name:'투두리스트 · 루틴 관리',
      callback:()=>this.openRoutineManager()
    });

    const scheduledChecks = async () => {
      await this.normalizeHistoricalRoutineTaxonomy();
      await this.reconcileRoutineOccurrencesFromToday();
      await this.runRoutineIntegrityPass({ force:true });
      await this.runMonthlyMaintenance();
    };
    this._taxonomyAutoPersistReady = true;
    this.app.workspace.onLayoutReady(() => {
      // First reconnect a synced historical Vault. Only a genuinely fresh install
      // may open onboarding automatically after that safety check.
      this.tryAutoReconnectLegacyStorage()
        .then(reconnected => {
          if (reconnected) {
            this.firstRunPending = false;
            this.setupSuggested = false;
          }
          const taxonomyMigration = this.needsLegacyTaxonomyMigration
            ? this.migrateCompactCategories(saved)
            : Promise.resolve();
          taxonomyMigration
            .then(() => this.refreshViews())
            .catch(err => console.error('투두리스트 카테고리 마이그레이션:', err));
          this.cleanupDeprecatedWidgetNotes().catch(err => console.error('Momoan Todo 구형 위젯 파일 정리:', err));
          scheduledChecks().catch(err => console.error('투두리스트 자동 정리:', err));
          if (this.firstRunPending) {
            window.setTimeout(() => {
              if (this.firstRunPending && !this.firstRunModalOpen) {
                this.openOnboardingGuideModal({ existing:false, replay:false });
              }
            }, 450);
          }
        })
        .catch(err => {
          console.error('Momoan Todo 기존 저장소 자동 재연결:', err);
          this.cleanupDeprecatedWidgetNotes().catch(e => console.error('Momoan Todo 구형 위젯 파일 정리:', e));
          scheduledChecks().catch(e => console.error('투두리스트 자동 정리:', e));
        });
    });
    this.registerInterval(window.setInterval(() => { scheduledChecks().catch(err => console.error('투두리스트 자동 정리:', err)); }, 60 * 60 * 1000));
    this.registerInterval(window.setInterval(() => {
      this.checkRoutineDayRollover().catch(err => console.error('투두리스트 날짜 전환 확인:', err));
    }, 15 * 60 * 1000));
    this.registerDomEvent(window, 'focus', () => {
      this.checkRoutineDayRollover().catch(err => console.error('투두리스트 날짜 전환 확인:', err));
    });

    this.registerDomEvent(document, 'keydown', evt => {
      if (evt.defaultPrevented || evt.altKey || !(evt.ctrlKey || evt.metaKey)) return;
      const key = String(evt.key || '').toLowerCase();
      const wantsUndo = key === 'z' && !evt.shiftKey;
      const wantsRedo = (key === 'z' && evt.shiftKey) || (key === 'y' && !evt.shiftKey);
      if (!wantsUndo && !wantsRedo) return;

      const target = evt.target instanceof Element ? evt.target : null;
      if (target?.closest?.('input, textarea, [contenteditable="true"], .cm-editor, .modal-container')) return;
      const activeView = this.app.workspace.activeLeaf?.view;
      if (activeView?.getViewType?.() !== VIEW_TYPE) return;
      if (wantsUndo && !this.canUndo()) return;
      if (wantsRedo && !this.canRedo()) return;

      evt.preventDefault();
      evt.stopPropagation();
      const action = wantsUndo ? this.undoLastChange() : this.redoLastChange();
      action.catch(err => console.error('Momoan Todo undo/redo:', err));
    });

    const invalidate = file => {
      if (!file?.path) return;
      if (file.path.startsWith(`${DATA_FOLDER}/`) || file.path === TASK_HUB_PATH) {
        this.invalidateFile(file.path);
        this.refreshViews();
        return;
      }
      // v0.9.45: monthly review notes are edited in a separate Markdown leaf.
      // Refresh only currently expanded review panels when that file changes so
      // the inline journal reflects the edit immediately without re-rendering the
      // whole Todo view for unrelated Vault modifications.
      if (file.path.startsWith(`${MONTHLY_REVIEW_FOLDER}/`)) {
        this.refreshMonthlyReviewViews();
      }
    };
    const markRoutineIntegrityDirty = (fileOrPath, oldPath=null) => {
      const paths = [
        typeof fileOrPath === 'string' ? fileOrPath : fileOrPath?.path,
        oldPath
      ].filter(Boolean);
      if (paths.some(path => path === ROUTINE_PATH || path.startsWith(`${DATA_FOLDER}/`))) {
        this._routineIntegrityRevision += 1;
      }
    };
    const maybeReconnectFromSync = file => {
      if (!file?.path?.startsWith(`${LEGACY_STORAGE_PATHS.root}/`)) return;
      this.tryAutoReconnectLegacyStorage().catch(err => console.error('Momoan Todo Sync 저장소 재연결:', err));
    };
    this.registerEvent(this.app.vault.on('modify', file => {
      markRoutineIntegrityDirty(file);
      invalidate(file);
      maybeReconnectFromSync(file);
    }));
    this.registerEvent(this.app.vault.on('create', file => {
      markRoutineIntegrityDirty(file);
      invalidate(file);
      maybeReconnectFromSync(file);
    }));
    this.registerEvent(this.app.vault.on('delete', file => {
      markRoutineIntegrityDirty(file);
      invalidate(file);
    }));
    this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
      markRoutineIntegrityDirty(file, oldPath);
      if (oldPath?.startsWith(`${DATA_FOLDER}/`)) this.monthCache.clear();
      invalidate(file);
      maybeReconnectFromSync(file);
    }));

    // Full Calendar를 계속 쓰는 경우, 날짜 클릭을 투두리스트와 동기화한다.
    this.registerDomEvent(document, 'click', evt => {
      const eventEl = evt.target?.closest?.('.fc-event');
      if (eventEl) return;
      const cell = evt.target?.closest?.('.fc-daygrid-day[data-date]');
      if (!cell) return;
      const date = cell.getAttribute('data-date');
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) this.setSelectedDate(date);
    }, true);
  }

  onunload() {
    this._taxonomyAutoPersistReady = false;
    if (ACTIVE_MOMO_PLUGIN === this) ACTIVE_MOMO_PLUGIN = null;
    if (GROUP_DISCOVERY_PERSIST_TIMER) {
      window.clearTimeout(GROUP_DISCOVERY_PERSIST_TIMER);
      GROUP_DISCOVERY_PERSIST_TIMER = null;
    }
    this.uiStyle?.remove();
    this.accentStyle?.remove();
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
  }

  detectLegacyVaultEvidence(saved={}) {
    const files = this.app.vault.getFiles();
    const isLegacyFile = file => Boolean(file?.path) && (
      file.path.startsWith(`${LEGACY_STORAGE_PATHS.dataFolder}/`) ||
      file.path === LEGACY_STORAGE_PATHS.taskHubPath ||
      file.path === LEGACY_STORAGE_PATHS.routinePath ||
      file.path === LEGACY_STORAGE_PATHS.routineOverviewPath
    );

    // Historical task/routine files are definitive evidence. Some sync backends
    // report file size late during startup, so do not depend on stat.size here.
    if (files.some(isLegacyFile)) return true;

    // v0.8 beta builds could overwrite installProfile while leaving the real
    // historical storage path intact. Treat that path as legacy when it exists.
    const configuredRoot = normalizeVaultPath(saved?.storage?.root || '');
    const configuredData = normalizeVaultPath(saved?.storage?.dataFolder || '');
    if (configuredRoot === LEGACY_STORAGE_PATHS.root || configuredData === LEGACY_STORAGE_PATHS.dataFolder) {
      return files.some(file => file?.path?.startsWith(`${LEGACY_STORAGE_PATHS.root}/`));
    }
    return false;
  }

  async detectLegacyTaskContent(saved={}) {
    // Rescue detection must still run even if an earlier v0.8 beta incorrectly
    // wrote installProfile=public. Only strong, author-specific signatures flip
    // the install back to the historical taxonomy.
    const candidateRoots = [];
    const savedStorage = saved?.storage && typeof saved.storage === 'object'
      ? { ...storagePathsFromRoot(saved.storage.root || DEFAULT_STORAGE_ROOT), ...saved.storage }
      : null;
    if (savedStorage?.dataFolder) candidateRoots.push(normalizeVaultPath(savedStorage.dataFolder));
    candidateRoots.push(LEGACY_STORAGE_PATHS.dataFolder);

    const roots = [...new Set(candidateRoots.filter(Boolean))];
    const files = this.app.vault.getFiles()
      .filter(file => file?.path?.endsWith('.md') && roots.some(root => file.path.startsWith(`${root}/`)))
      .sort((a,b)=>(b.stat?.mtime || 0) - (a.stat?.mtime || 0))
      .slice(0, 48);
    if (!files.length) return false;

    const strongGroups = ['오행','살바람','여름을 훔친 아이','에픽세븐','도라셔다'];
    const legacyOnlyTags = ['#창작','#약속','#기념일'];
    const secondaryGroups = ['커리어','공적 약속','사적 약속','루틴','운동','정리','쇼핑','게임','독서','영화','생일','기념일'];
    for (const file of files) {
      try {
        const content = await this.app.vault.cachedRead(file);
        if (strongGroups.some(group => content.includes(`[sourceGroup:: ${group}]`))) return true;
        const hasLegacyTag = legacyOnlyTags.some(tag => new RegExp(`(^|\\s)${escapeRegex(tag)}(?=\\s|$)`, 'm').test(content));
        const hasSecondaryGroup = secondaryGroups.some(group => content.includes(`[sourceGroup:: ${group}]`));
        if (hasLegacyTag && hasSecondaryGroup) return true;
      } catch (_) {}
    }
    return false;
  }

  hasLegacyItemSignature(items=[]) {
    const legacyOnlyCategories = new Set(['창작','약속','기념일']);
    const strongGroups = new Set(['오행','살바람','여름을 훔친 아이','에픽세븐','도라셔다']);
    return (items || []).some(item => legacyOnlyCategories.has(item?.category) || strongGroups.has(item?.group));
  }

  currentTaxonomyMatches(order=[]) {
    return Array.isArray(order) && CATEGORIES.length === order.length &&
      order.every((name, index) => CATEGORIES[index] === name);
  }

  currentTaxonomyLooksPublicStarter() {
    return [PUBLIC_DEFAULT_CATEGORIES, PUBLIC_MINIMAL_CATEGORIES, PUBLIC_BLANK_CATEGORIES]
      .some(order => this.currentTaxonomyMatches(order));
  }

  async recoverLegacyRuntimeFromItems(items=[]) {
    if (!this.hasLegacyItemSignature(items)) return false;

    // Runtime rescue is only for a Vault that was mistakenly initialized with a
    // public starter taxonomy. Never overwrite a taxonomy that the user already
    // customized: otherwise a saved rename can silently revert while rendering.
    const publicStarter = this.currentTaxonomyLooksPublicStarter();
    if (!this.firstRunPending && !publicStarter) return false;

    const alreadyCanonical = !this.firstRunPending && this.isLegacyInstall &&
      CATEGORIES.length === LEGACY_DEFAULT_CATEGORIES.length &&
      LEGACY_DEFAULT_CATEGORIES.every((name, index) => CATEGORIES[index] === name);
    if (alreadyCanonical) return false;

    this.hasLegacyVaultEvidence = true;
    this.legacyTaxonomyRepaired = true;
    this.firstRunPending = false;
    this.isLegacyInstall = true;
    this.installProfile = 'legacy-migrated';
    this.needsLegacyTaxonomyMigration = false;

    CATEGORIES.splice(0, CATEGORIES.length, ...LEGACY_DEFAULT_CATEGORIES);
    for (const key of Object.keys(GROUP_PRESETS)) delete GROUP_PRESETS[key];
    for (const category of LEGACY_DEFAULT_CATEGORIES) {
      GROUP_PRESETS[category] = [...(LEGACY_GROUP_PRESETS[category] || ['기타'])];
      ensureCategoryRuntime(category);
    }

    this.inactiveCategories = new Set(
      [...(this.inactiveCategories || new Set())].filter(category => CATEGORIES.includes(category) && category !== '기타')
    );
    const nextInactiveGroups = {};
    for (const category of CATEGORIES) {
      const allowed = new Set(GROUP_PRESETS[category] || ['기타']);
      nextInactiveGroups[category] = new Set(
        [...(this.inactiveGroups?.[category] || new Set())].filter(group => allowed.has(group) && group !== '기타')
      );
    }
    this.inactiveGroups = nextInactiveGroups;

    this.categoryIds = new Map();
    this.groupIds = new Map();
    for (const category of CATEGORIES) {
      this.ensureCategoryIdentity(category);
      for (const group of GROUP_PRESETS[category] || ['기타']) this.ensureGroupIdentity(category, group);
    }

    const hasHistoricalDataPath = this.app.vault.getFiles().some(file =>
      file?.path?.startsWith(`${LEGACY_STORAGE_PATHS.dataFolder}/`)
    );
    if (hasHistoricalDataPath) {
      applyRuntimeStoragePaths(LEGACY_STORAGE_PATHS);
      this.storageSettings = { ...ACTIVE_STORAGE_PATHS };
      this.monthCache.clear();
    }

    await this.saveCategorySettings({
      settingsSchemaVersion:SETTINGS_SCHEMA_VERSION,
      storageSchemaVersion:1,
      taxonomyIdSchemaVersion:TAXONOMY_ID_SCHEMA_VERSION,
      taxonomySchemaVersion:TAXONOMY_SCHEMA_VERSION,
      categorySchemaVersion:TAXONOMY_SCHEMA_VERSION,
      onboardingCompleted:true,
      onboardingVersion:ONBOARDING_SCHEMA_VERSION,
      installProfile:'legacy-migrated',
      legacyTaxonomyRescueVersion:LEGACY_TAXONOMY_RESCUE_VERSION
    }).catch(err => console.error('Momoan Todo 런타임 기존 Vault 복구:', err));
    return true;
  }

  hasMeaningfulConfiguredData(saved={}) {
    const configured = saved?.storage && typeof saved.storage === 'object'
      ? { ...storagePathsFromRoot(saved.storage.root || DEFAULT_STORAGE_ROOT), ...saved.storage }
      : storagePathsFromRoot(DEFAULT_STORAGE_ROOT);
    return this.app.vault.getFiles().some(file => {
      if (!file?.path || Number(file.stat?.size || 0) <= 0) return false;
      return file.path.startsWith(`${configured.dataFolder}/`) ||
        file.path === configured.taskHubPath ||
        file.path === configured.routinePath ||
        file.path === configured.routineOverviewPath;
    });
  }

  forceLegacyVaultState(saved={}) {
    if (!this.hasLegacyVaultEvidence && !this.detectLegacyVaultEvidence(saved)) return false;

    const structured = saved.taxonomy && Array.isArray(saved.taxonomy.categories)
      ? saved.taxonomy.categories
      : null;
    const previousNames = structured?.length
      ? structured.map(entry => normalizeCategoryName(entry?.name)).filter(Boolean)
      : (Array.isArray(saved.categories) ? saved.categories.map(normalizeCategoryName).filter(Boolean) : []);
    const previousRoot = normalizeVaultPath(saved?.storage?.root || '');

    // IMPORTANT: legacy evidence identifies the Vault/storage lineage only. It must
    // never overwrite a taxonomy the user has already customized. Older builds
    // forced LEGACY_DEFAULT_CATEGORIES on every startup, which made category/group
    // renames appear to save and then revert after reload. Only repair taxonomy
    // when it is genuinely missing or is the known public-default contamination.
    const looksLikePublicDefaults = previousNames.length === PUBLIC_DEFAULT_CATEGORIES.length &&
      PUBLIC_DEFAULT_CATEGORIES.every((name, index) => previousNames[index] === name);
    const hasSavedTaxonomy = Boolean(structured?.length || previousNames.length);
    const needsTaxonomyRepair = !hasSavedTaxonomy || looksLikePublicDefaults;

    let changed = false;

    // Keep an explicitly moved custom storage root. Otherwise reconnect historical
    // Momoan Vaults to their legacy root as before.
    const shouldUseLegacyStorage = !previousRoot ||
      previousRoot === DEFAULT_STORAGE_ROOT ||
      previousRoot === LEGACY_STORAGE_PATHS.root;
    if (shouldUseLegacyStorage) {
      const storageAlreadyCanonical = previousRoot === LEGACY_STORAGE_PATHS.root;
      saved.storage = { ...LEGACY_STORAGE_PATHS };
      if (!storageAlreadyCanonical) changed = true;
    }

    if (needsTaxonomyRepair) {
      saved.categories = [...LEGACY_DEFAULT_CATEGORIES];
      saved.groups = Object.fromEntries(
        LEGACY_DEFAULT_CATEGORIES.map(category => [category, [...(LEGACY_GROUP_PRESETS[category] || ['기타'])]])
      );
      saved.categoryTags = Object.fromEntries(
        LEGACY_DEFAULT_CATEGORIES.map(category => [category, CATEGORY_TAGS[category] || `#${category}`])
      );
      delete saved.taxonomy;
      changed = true;
    }

    if (saved.installProfile !== 'legacy-migrated') changed = true;
    if (saved.onboardingCompleted !== true) changed = true;
    if (Number(saved.onboardingVersion || 0) < ONBOARDING_SCHEMA_VERSION) changed = true;

    saved.installProfile = 'legacy-migrated';
    saved.onboardingCompleted = true;
    saved.onboardingVersion = ONBOARDING_SCHEMA_VERSION;
    saved.taxonomySchemaVersion = TAXONOMY_SCHEMA_VERSION;
    saved.categorySchemaVersion = TAXONOMY_SCHEMA_VERSION;
    saved.legacyTaxonomyRescueVersion = LEGACY_TAXONOMY_RESCUE_VERSION;

    return changed;
  }

  repairLegacyTaxonomyState(saved={}) {
    if (Number(saved?.legacyTaxonomyRescueVersion || 0) >= LEGACY_TAXONOMY_RESCUE_VERSION) return false;

    const configuredRoot = normalizeVaultPath(saved?.storage?.root || '');
    const hasLegacyStorage = configuredRoot === LEGACY_STORAGE_PATHS.root ||
      this.app.vault.getFiles().some(file =>
        file.path.startsWith(`${LEGACY_STORAGE_PATHS.dataFolder}/`) ||
        file.path === LEGACY_STORAGE_PATHS.routinePath ||
        file.path === LEGACY_STORAGE_PATHS.taskHubPath
      );
    if (!hasLegacyStorage) return false;

    const structured = saved.taxonomy && Array.isArray(saved.taxonomy.categories)
      ? saved.taxonomy.categories
      : null;
    const names = structured?.length
      ? structured.map(entry => normalizeCategoryName(entry?.name)).filter(Boolean)
      : (Array.isArray(saved.categories) ? saved.categories.map(normalizeCategoryName).filter(Boolean) : []);

    // v0.8.0~0.8.5 사이 공개용 기본 분류가 기존 Momoan Vault의 정본 분류를
    // 덮어쓴 경우만 1회 복구합니다. 실제 markdown 데이터는 건드리지 않습니다.
    const looksLikePublicDefaults = names.length === PUBLIC_DEFAULT_CATEGORIES.length &&
      PUBLIC_DEFAULT_CATEGORIES.every((name, index) => names[index] === name);
    if (!looksLikePublicDefaults) return false;

    saved.categories = [...LEGACY_DEFAULT_CATEGORIES];
    saved.groups = Object.fromEntries(
      LEGACY_DEFAULT_CATEGORIES.map(category => [category, [...(LEGACY_GROUP_PRESETS[category] || ['기타'])]])
    );
    saved.categoryTags = Object.fromEntries(
      LEGACY_DEFAULT_CATEGORIES.map(category => [category, CATEGORY_TAGS[category] || `#${category}`])
    );
    // 구조화 taxonomy는 아래 런타임에서 복구된 정본을 기준으로 다시 생성합니다.
    delete saved.taxonomy;
    saved.installProfile = 'legacy-migrated';
    saved.onboardingCompleted = true;
    saved.onboardingVersion = ONBOARDING_SCHEMA_VERSION;
    saved.taxonomySchemaVersion = TAXONOMY_SCHEMA_VERSION;
    saved.categorySchemaVersion = TAXONOMY_SCHEMA_VERSION;
    saved.legacyTaxonomyRescueVersion = LEGACY_TAXONOMY_RESCUE_VERSION;
    return true;
  }

  detectContaminatedFreshState(saved={}) {
    if (this.detectLegacyVaultEvidence(saved)) return false;
    // v0.8.2~0.8.3 테스트 과정에서 개인용 레거시 분류가 빈 Vault의
    // data.json에 잘못 남은 경우만 신규 설치로 되돌립니다. 실제 할 일/루틴
    // 파일이 하나라도 있으면 기존 사용자 데이터로 간주하여 건드리지 않습니다.
    if (saved?.onboardingCompleted !== true) return false;

    const structured = saved.taxonomy && Array.isArray(saved.taxonomy.categories)
      ? saved.taxonomy.categories
      : null;
    const categoryNames = structured?.length
      ? structured.map(entry => normalizeCategoryName(entry?.name)).filter(Boolean)
      : (Array.isArray(saved.categories) ? saved.categories.map(normalizeCategoryName).filter(Boolean) : []);
    if (categoryNames.length !== LEGACY_DEFAULT_CATEGORIES.length ||
        !LEGACY_DEFAULT_CATEGORIES.every((name, index) => categoryNames[index] === name)) return false;

    const groupsFor = category => {
      if (structured?.length) {
        const entry = structured.find(item => normalizeCategoryName(item?.name) === category);
        return Array.isArray(entry?.groups)
          ? entry.groups.map(group => normalizeCategoryName(group?.name)).filter(Boolean)
          : [];
      }
      return Array.isArray(saved.groups?.[category])
        ? saved.groups[category].map(normalizeCategoryName).filter(Boolean)
        : [];
    };

    for (const category of LEGACY_DEFAULT_CATEGORIES) {
      const actual = groupsFor(category);
      const expected = LEGACY_GROUP_PRESETS[category] || ['기타'];
      if (actual.length !== expected.length || !expected.every((name, index) => actual[index] === name)) return false;
    }

    const configured = saved.storage && typeof saved.storage === 'object'
      ? { ...storagePathsFromRoot(saved.storage.root || DEFAULT_STORAGE_ROOT), ...saved.storage }
      : storagePathsFromRoot(DEFAULT_STORAGE_ROOT);
    const meaningfulFiles = this.app.vault.getFiles().some(file => {
      if (!file?.path || Number(file.stat?.size || 0) <= 0) return false;
      return file.path.startsWith(`${configured.dataFolder}/`) ||
        file.path.startsWith(`${configured.monthlyRecordFolder}/`) ||
        file.path.startsWith(`${configured.monthlyReviewFolder}/`) ||
        file.path === configured.taskHubPath ||
        file.path === configured.routinePath ||
        file.path === configured.routineOverviewPath;
    });
    return !meaningfulFiles;
  }

  detectFreshInstall(saved={}) {
    if (this.detectLegacyVaultEvidence(saved)) return false;

    const onboardingVersion = Number(saved?.onboardingVersion || 0);
    if (saved?.onboardingCompleted === true && onboardingVersion >= ONBOARDING_SCHEMA_VERSION) return false;

    // During the v0.8 beta, earlier builds could mark a test Vault as completed
    // (sometimes even as `legacy-migrated`) without a usable setup. Re-run the
    // updated onboarding once when the saved taxonomy is still one of the public
    // starter presets. Existing task files are preserved.
    if (onboardingVersion < ONBOARDING_SCHEMA_VERSION) {
      const structured = saved?.taxonomy && Array.isArray(saved.taxonomy.categories)
        ? saved.taxonomy.categories.map(entry => normalizeCategoryName(entry?.name)).filter(Boolean)
        : (Array.isArray(saved?.categories) ? saved.categories.map(normalizeCategoryName).filter(Boolean) : []);
      const presetOrders = [PUBLIC_DEFAULT_CATEGORIES, PUBLIC_MINIMAL_CATEGORIES, PUBLIC_BLANK_CATEGORIES];
      const looksLikePublicPreset = presetOrders.some(order =>
        structured.length === order.length && order.every((name, index) => structured[index] === name)
      );
      if (saved?.installProfile === 'public' || looksLikePublicPreset || !this.hasMeaningfulConfiguredData(saved)) return true;
    }

    const hasPluginState = Boolean(
      Number(saved.settingsSchemaVersion || 0) > 0 ||
      Number(saved.taxonomySchemaVersion || 0) > 0 ||
      saved.storage ||
      saved.taxonomy ||
      (Array.isArray(saved.categories) && saved.categories.length) ||
      (saved.groups && Object.keys(saved.groups).length) ||
      saved.categoryTags
    );
    if (hasPluginState) return false;

    const publicPaths = storagePathsFromRoot(DEFAULT_STORAGE_ROOT);
    const knownRoots = [LEGACY_STORAGE_PATHS.root, publicPaths.root];
    return !this.app.vault.getFiles().some(file =>
      knownRoots.some(root => file.path === root || file.path.startsWith(`${root}/`))
    );
  }

  detectLegacyInstall(saved={}) {
    if (this.detectLegacyVaultEvidence(saved)) return true;
    if (saved.installProfile === 'public') return false;
    if (saved.installProfile === 'legacy-migrated') return true;
    const hasSavedState = Boolean(
      saved.taxonomySchemaVersion ||
      saved.categorySchemaVersion ||
      (Array.isArray(saved.categories) && saved.categories.length) ||
      (saved.groups && Object.keys(saved.groups).length) ||
      saved.categoryTags
    );
    if (hasSavedState) return true;
    return this.app.vault.getFiles().some(file =>
      file.path.startsWith(`${LEGACY_STORAGE_PATHS.root}/`) ||
      file.path === LEGACY_STORAGE_PATHS.taskHubPath ||
      file.path === LEGACY_STORAGE_PATHS.routinePath ||
      file.path === LEGACY_STORAGE_PATHS.routineOverviewPath
    );
  }

  taxonomyGroupKey(category, group) {
    return `${category}::momo::${group}`;
  }

  makeTaxonomyId(prefix='id') {
    const uuid = globalThis.crypto?.randomUUID?.();
    if (uuid) return `${prefix}_${uuid}`;
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,10)}`;
  }

  loadTaxonomyIdentities(saved={}) {
    this.categoryIds = new Map();
    this.groupIds = new Map();
    const structured = saved.taxonomy && Array.isArray(saved.taxonomy.categories)
      ? saved.taxonomy.categories
      : [];

    for (const entry of structured) {
      const category = normalizeCategoryName(entry?.name);
      if (!category) continue;
      if (entry.id) this.categoryIds.set(category, String(entry.id));
      if (!Array.isArray(entry.groups)) continue;
      for (const groupEntry of entry.groups) {
        const group = normalizeCategoryName(groupEntry?.name);
        if (!group || !groupEntry?.id) continue;
        this.groupIds.set(this.taxonomyGroupKey(category, group), String(groupEntry.id));
      }
    }

    for (const category of CATEGORIES) {
      this.ensureCategoryIdentity(category);
      for (const group of GROUP_PRESETS[category] || ['기타']) {
        this.ensureGroupIdentity(category, group);
      }
    }
  }

  ensureCategoryIdentity(category) {
    if (!this.categoryIds) this.categoryIds = new Map();
    if (!this.categoryIds.has(category)) this.categoryIds.set(category, this.makeTaxonomyId('cat'));
    return this.categoryIds.get(category);
  }

  ensureGroupIdentity(category, group) {
    if (!this.groupIds) this.groupIds = new Map();
    const key = this.taxonomyGroupKey(category, group);
    if (!this.groupIds.has(key)) this.groupIds.set(key, this.makeTaxonomyId('grp'));
    return this.groupIds.get(key);
  }

  renameCategoryIdentity(from, to) {
    if (!from || !to || from === to) return;
    const id = this.categoryIds?.get(from);
    if (id) {
      this.categoryIds.delete(from);
      this.categoryIds.set(to, id);
    }
    if (!this.groupIds) return;
    const moved = [];
    for (const [key, groupId] of this.groupIds.entries()) {
      const [category, group] = key.split('::momo::');
      if (category === from) moved.push([key, group, groupId]);
    }
    for (const [oldKey, group, groupId] of moved) {
      this.groupIds.delete(oldKey);
      this.groupIds.set(this.taxonomyGroupKey(to, group), groupId);
    }
  }

  renameGroupIdentity(category, from, to) {
    if (!category || !from || !to || from === to || !this.groupIds) return;
    const oldKey = this.taxonomyGroupKey(category, from);
    const id = this.groupIds.get(oldKey);
    if (!id) return;
    this.groupIds.delete(oldKey);
    this.groupIds.set(this.taxonomyGroupKey(category, to), id);
  }

  removeCategoryIdentity(category) {
    this.categoryIds?.delete(category);
    if (!this.groupIds) return;
    for (const key of [...this.groupIds.keys()]) {
      if (key.startsWith(`${category}::momo::`)) this.groupIds.delete(key);
    }
  }

  removeGroupIdentity(category, group) {
    this.groupIds?.delete(this.taxonomyGroupKey(category, group));
  }

  repairTaxonomyIdentityCollisions() {
    let repaired = 0;
    const seenCategoryIds = new Set();
    for (const category of CATEGORIES) {
      let id = this.ensureCategoryIdentity(category);
      if (seenCategoryIds.has(id)) {
        id = this.makeTaxonomyId('cat');
        this.categoryIds.set(category, id);
        repaired += 1;
      }
      seenCategoryIds.add(id);
    }

    const seenGroupIds = new Set();
    for (const category of CATEGORIES) {
      for (const group of GROUP_PRESETS[category] || ['기타']) {
        const key = this.taxonomyGroupKey(category, group);
        let id = this.ensureGroupIdentity(category, group);
        if (seenGroupIds.has(id)) {
          id = this.makeTaxonomyId('grp');
          this.groupIds.set(key, id);
          repaired += 1;
        }
        seenGroupIds.add(id);
      }
    }
    if (repaired) console.warn(`Momoan Todo · taxonomy identity collision ${repaired}건을 자동 복구했습니다.`);
    return repaired;
  }

  buildTaxonomySettings() {
    this.repairTaxonomyIdentityCollisions();
    return {
      schemaVersion:TAXONOMY_ID_SCHEMA_VERSION,
      categories:CATEGORIES.map(category => ({
        id:this.ensureCategoryIdentity(category),
        name:category,
        tag:categoryTag(category),
        inactive:Boolean(this.inactiveCategories?.has(category)),
        groups:(GROUP_PRESETS[category] || ['기타']).map(group => ({
          id:this.ensureGroupIdentity(category, group),
          name:group,
          inactive:Boolean(this.inactiveGroups?.[category]?.has(group))
        }))
      }))
    };
  }

  buildStorageSettings() {
    return { ...ACTIVE_STORAGE_PATHS };
  }

  storageHasRecognizableStructure(paths, { requireMeaningful=false }={}) {
    if (!paths?.root) return false;
    const dataFolder = this.app.vault.getAbstractFileByPath(paths.dataFolder);
    const taskHub = this.app.vault.getAbstractFileByPath(paths.taskHubPath);
    const routine = this.app.vault.getAbstractFileByPath(paths.routinePath);
    const routineOverview = this.app.vault.getAbstractFileByPath(paths.routineOverviewPath);
    const files = this.app.vault.getFiles();
    const dataFiles = files.filter(file => file?.path?.startsWith(`${paths.dataFolder}/`) && file.path.endsWith('.md'));

    if (requireMeaningful) {
      if (dataFiles.some(file => Number(file.stat?.size || 0) > 0)) return true;
      return [taskHub, routine, routineOverview].some(file => file?.stat && Number(file.stat.size || 0) > 0);
    }

    return Boolean(dataFolder || taskHub || routine || routineOverview || dataFiles.length);
  }

  resolveExistingStorageRoot(root, { requireMeaningful=false }={}) {
    const cleanRoot = normalizeVaultPath(root);
    if (!cleanRoot) return null;

    if (cleanRoot === LEGACY_STORAGE_PATHS.root) {
      return this.storageHasRecognizableStructure(LEGACY_STORAGE_PATHS, { requireMeaningful })
        ? { paths:{ ...LEGACY_STORAGE_PATHS }, legacy:true }
        : null;
    }

    const modern = storagePathsFromRoot(cleanRoot);
    return this.storageHasRecognizableStructure(modern, { requireMeaningful })
      ? { paths:modern, legacy:false }
      : null;
  }

  applyLegacyTaxonomyRuntime({ forceTaxonomy=false }={}) {
    const replaceTaxonomy = forceTaxonomy || this.firstRunPending || this.currentTaxonomyLooksPublicStarter();

    if (replaceTaxonomy) {
      CATEGORIES.splice(0, CATEGORIES.length, ...LEGACY_DEFAULT_CATEGORIES);
      for (const key of Object.keys(GROUP_PRESETS)) delete GROUP_PRESETS[key];
      for (const category of LEGACY_DEFAULT_CATEGORIES) {
        GROUP_PRESETS[category] = [...(LEGACY_GROUP_PRESETS[category] || ['기타'])];
        ensureCategoryRuntime(category);
      }

      this.inactiveCategories = new Set();
      this.inactiveGroups = {};
      this.categoryIds = new Map();
      this.groupIds = new Map();
      for (const category of CATEGORIES) {
        this.inactiveGroups[category] = new Set();
        this.ensureCategoryIdentity(category);
        for (const group of GROUP_PRESETS[category] || ['기타']) this.ensureGroupIdentity(category, group);
      }
    } else {
      // Connecting a storage root must not also reset names, order or IDs.
      for (const category of CATEGORIES) {
        ensureCategoryRuntime(category);
        this.ensureCategoryIdentity(category);
        for (const group of GROUP_PRESETS[category] || ['기타']) this.ensureGroupIdentity(category, group);
      }
    }

    this.hasLegacyVaultEvidence = true;
    this.legacyTaxonomyRepaired = true;
    this.firstRunPending = false;
    this.isLegacyInstall = true;
    this.installProfile = 'legacy-migrated';
    this.needsLegacyTaxonomyMigration = false;
  }

  recoverySnapshotTimestamp(date=new Date()) {
    const pad = value => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
  }

  recoverySnapshotFilename(prefix='Momoan Todo Recovery') {
    return `${prefix} ${this.recoverySnapshotTimestamp()}.json`;
  }

  async buildRecoverySnapshot({ kind='recovery' }={}) {
    await waitForPendingFileMutations();
    // Snapshot the current in-memory taxonomy/settings too, not only the last
    // data.json write. This closes the small gap where a discovered group or
    // rename is already visible in the UI but its debounced save has not fired.
    try { await this.saveCategorySettings(); } catch (_) {}
    const root = normalizeVaultPath(ACTIVE_STORAGE_PATHS.root || DEFAULT_STORAGE_ROOT);
    const allowedExtensions = new Set(['md','json','txt']);
    const autoBackupPrefix = `${root}/_Backups/`;
    const files = this.app.vault.getFiles()
      .filter(file => file.path.startsWith(`${root}/`))
      .filter(file => !file.path.startsWith(autoBackupPrefix))
      .filter(file => allowedExtensions.has(String(file.extension || '').toLowerCase()))
      .sort((a,b) => a.path.localeCompare(b.path));

    const entries = [];
    for (const file of files) {
      entries.push({ path:file.path, content:await this.app.vault.read(file) });
    }

    return {
      format:'momoan-todo-recovery-snapshot',
      formatVersion:1,
      kind,
      createdAt:new Date().toISOString(),
      pluginVersion:this.manifest?.version || '',
      storageRoot:root,
      pluginData:await this.loadData().catch(() => ({})) || {},
      files:entries
    };
  }

  recoverySnapshotFolder() {
    const root = normalizeVaultPath(ACTIVE_STORAGE_PATHS.root || DEFAULT_STORAGE_ROOT);
    return `${root}/_Backups`;
  }

  async writeRecoverySnapshot(snapshot, prefix='Momoan Todo Recovery') {
    const folder = this.recoverySnapshotFolder();
    await this.ensureFolder(folder);
    const path = `${folder}/${this.recoverySnapshotFilename(prefix)}`;
    const existing = this.app.vault.getAbstractFileByPath(path);
    const content = JSON.stringify(snapshot, null, 2);
    if (existing) await this.app.vault.modify(existing, content);
    else await this.app.vault.create(path, content);
    return path;
  }

  async exportRecoverySnapshot() {
    const snapshot = await this.buildRecoverySnapshot({ kind:'recovery' });
    return this.writeRecoverySnapshot(snapshot, 'Momoan Todo Recovery');
  }

  async findLatestRecoverySnapshot() {
    // Search by file name so snapshots created by older versions at the Vault
    // root remain restorable after manual snapshots move under _Backups.
    const candidates = this.app.vault.getFiles()
      .filter(file => /^Momoan Todo Recovery .*\.json$/i.test(file.name))
      .sort((a,b) => (b.stat?.mtime || 0) - (a.stat?.mtime || 0));
    return candidates[0] || null;
  }

  autoSafetyBackupFolder() {
    const root = normalizeVaultPath(ACTIVE_STORAGE_PATHS.root || DEFAULT_STORAGE_ROOT);
    return `${root}/_Backups`;
  }

  async createRollingAutoSafetyBackup(reason='destructive-change') {
    const snapshot = await this.buildRecoverySnapshot({ kind:'auto-safety-backup' });
    snapshot.reason = String(reason || 'destructive-change');
    const folder = this.autoSafetyBackupFolder();
    await this.ensureFolder(folder);
    const safeReason = String(reason || 'change').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 40);
    const path = `${folder}/Momoan Todo Auto ${this.recoverySnapshotTimestamp()}-${Date.now()} ${safeReason}.json`;
    const content = JSON.stringify(snapshot, null, 2);
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (existing) await this.app.vault.modify(existing, content);
    else await this.app.vault.create(path, content);

    const backups = this.app.vault.getFiles()
      .filter(file => file.path.startsWith(`${folder}/`) && /^Momoan Todo Auto .*\.json$/i.test(file.name))
      .sort((a,b) => (b.stat?.mtime || 0) - (a.stat?.mtime || 0));
    for (const stale of backups.slice(5)) {
      try { await this.app.vault.delete(stale); } catch (_) {}
    }
    return path;
  }

  async findLatestAutoSafetyBackup() {
    const folder = this.autoSafetyBackupFolder();
    const backups = this.app.vault.getFiles()
      .filter(file => file.path.startsWith(`${folder}/`) && /^Momoan Todo Auto .*\.json$/i.test(file.name))
      .sort((a,b) => (b.stat?.mtime || 0) - (a.stat?.mtime || 0));
    return backups[0] || null;
  }

  async restoreSnapshotFile(file, { missingMessage='snapshotMissing' }={}) {
    if (!file) throw new Error(uiText(missingMessage));
    await waitForPendingFileMutations();

    let snapshot;
    try { snapshot = JSON.parse(await this.app.vault.read(file)); }
    catch (_) { throw new Error(uiText('snapshotInvalid')); }
    if (!snapshot || snapshot.format !== 'momoan-todo-recovery-snapshot' || !Array.isArray(snapshot.files)) {
      throw new Error(uiText('snapshotInvalid'));
    }

    // Always create a one-file rollback point before touching current data.
    const before = await this.buildRecoverySnapshot({ kind:'pre-restore-backup' });
    await this.writeRecoverySnapshot(before, 'Momoan Todo Pre-Restore');

    const targetRoot = normalizeVaultPath(snapshot.storageRoot || snapshot?.pluginData?.storage?.root || ACTIVE_STORAGE_PATHS.root || DEFAULT_STORAGE_ROOT);
    const snapshotPaths = new Set(snapshot.files.map(entry => normalizeVaultPath(entry?.path || '')).filter(Boolean));
    const allowedExtensions = new Set(['md','json','txt']);

    const backupPrefix = `${targetRoot}/_Backups/`;
    const staleFiles = this.app.vault.getFiles()
      .filter(current => current.path.startsWith(`${targetRoot}/`))
      .filter(current => !current.path.startsWith(backupPrefix))
      .filter(current => allowedExtensions.has(String(current.extension || '').toLowerCase()))
      .filter(current => !snapshotPaths.has(normalizeVaultPath(current.path)));
    for (const stale of staleFiles) await this.app.vault.delete(stale);

    for (const entry of snapshot.files) {
      const path = normalizeVaultPath(entry?.path || '');
      if (!path || !path.startsWith(`${targetRoot}/`)) continue;
      const folder = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
      if (folder) await this.ensureFolder(folder);
      const existing = this.app.vault.getAbstractFileByPath(path);
      const content = String(entry?.content ?? '');
      if (existing) await this.app.vault.modify(existing, content);
      else await this.app.vault.create(path, content);
    }

    if (snapshot.pluginData && typeof snapshot.pluginData === 'object') await this.saveData(snapshot.pluginData);

    const restoredStorage = snapshot?.pluginData?.storage || storagePathsFromRoot(targetRoot);
    applyRuntimeStoragePaths(restoredStorage);
    this.storageSettings = { ...ACTIVE_STORAGE_PATHS };
    this.monthCache?.clear?.();
    this.refreshViews();
    return file.path;
  }

  async restoreLatestRecoverySnapshot() {
    return this.restoreSnapshotFile(await this.findLatestRecoverySnapshot(), { missingMessage:'snapshotMissing' });
  }

  async restoreLatestAutoSafetyBackup() {
    return this.restoreSnapshotFile(await this.findLatestAutoSafetyBackup(), { missingMessage:'autoBackupMissing' });
  }

  async connectExistingStorage(root, { automatic=false }={}) {
    const resolved = this.resolveExistingStorageRoot(root, { requireMeaningful:automatic });
    if (!resolved) throw new Error(uiText('connectStorageInvalid'));

    if (resolved.legacy) this.applyLegacyTaxonomyRuntime({ forceTaxonomy:automatic && this.currentTaxonomyLooksPublicStarter() });
    applyRuntimeStoragePaths(resolved.paths);
    this.storageSettings = { ...ACTIVE_STORAGE_PATHS };
    this.monthCache.clear();

    await this.saveCategorySettings(resolved.legacy ? {
      settingsSchemaVersion:SETTINGS_SCHEMA_VERSION,
      storageSchemaVersion:1,
      taxonomyIdSchemaVersion:TAXONOMY_ID_SCHEMA_VERSION,
      taxonomySchemaVersion:TAXONOMY_SCHEMA_VERSION,
      categorySchemaVersion:TAXONOMY_SCHEMA_VERSION,
      onboardingCompleted:true,
      onboardingVersion:ONBOARDING_SCHEMA_VERSION,
      installProfile:'legacy-migrated',
      legacyTaxonomyRescueVersion:LEGACY_TAXONOMY_RESCUE_VERSION
    } : {});

    this.refreshViews();
    return true;
  }

  async tryAutoReconnectLegacyStorage() {
    // Strict rescue for synced historical Vaults: only a public-profile plugin still
    // pointing at the default public root, with no meaningful data there, may switch.
    if (this.installProfile !== 'public') return false;
    if (normalizeVaultPath(ACTIVE_STORAGE_PATHS.root) !== DEFAULT_STORAGE_ROOT) return false;
    if (this.storageHasRecognizableStructure(ACTIVE_STORAGE_PATHS, { requireMeaningful:true })) return false;
    const legacy = this.resolveExistingStorageRoot(LEGACY_STORAGE_PATHS.root, { requireMeaningful:true });
    if (!legacy?.legacy) return false;

    await this.connectExistingStorage(LEGACY_STORAGE_PATHS.root, { automatic:true });
    return true;
  }


  applyAccentSetting() {
    const color = /^#[0-9a-fA-F]{6}$/.test(String(this.generalSettings?.accentColor || ''))
      ? this.generalSettings.accentColor
      : DEFAULT_ACCENT_COLOR;
    if (!this.accentStyle) {
      this.accentStyle = document.createElement('style');
      this.accentStyle.setAttribute('data-momoan-todo-accent', '');
      document.head.appendChild(this.accentStyle);
    }
    this.accentStyle.textContent = `
      .momoan-todo-view,
      .momo-first-run-modal,
      .momo-task-editor-modal,
      .momo-task-add-modal,
      .momo-choice-modal,
      .momo-todo-settings,
      .momo-retire-modal,
      .momo-monthly-review-modal,
      .momo-routine-manager,
      .momo-routine-editor,
      .momo-routine-delete-modal,
      .momo-text-prompt-modal,
      .momo-date-choice-modal,
      .momo-multi-date-choice-modal,
      .momo-task-actions-modal,
      .momo-month-picker-modal,
      .momo-onboarding-guide-modal,
      .momoan-todo-settings {
        --momo-accent:${color} !important;
        --momo-accent-strong:color-mix(in srgb, ${color} 82%, black) !important;
        --momo-accent-soft:color-mix(in srgb, ${color} 16%, transparent) !important;
      }
      .momoan-todo-view .momo-task-check.is-checked,
      .momo-task-editor-modal .mod-cta,
      .momo-routine-editor .mod-cta,
      .momo-routine-manager .mod-cta,
      .momo-first-run-modal .mod-cta,
      .momo-onboarding-guide-modal .mod-cta { background:${color} !important; border-color:${color} !important; color:var(--text-on-accent) !important; }
      .momoan-todo-view .momo-td-day.is-selected { box-shadow:inset 0 0 0 1.25px ${color} !important; }
      .momoan-todo-view .momo-td-day.is-today:not(.is-selected) { box-shadow:inset 0 0 0 1px color-mix(in srgb, ${color} 62%, transparent) !important; }
      .momoan-todo-view .momo-td-day-count,
      .momoan-todo-view .momo-td-count,
      .momoan-todo-view .momo-td-head-progress-done,
      .momoan-todo-view .momo-td-month-summary-number { color:${color} !important; opacity:.88 !important; }
      .momoan-todo-view .momo-td-view-toggle.is-on .momo-td-mini-switch { background:${color} !important; }
      .momoan-todo-settings .checkbox-container.is-enabled { background:${color} !important; }
    `;
  }

  formatTimeForDisplay(time='') {
    const match = String(time || '').match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return String(time || '');
    if (this.generalSettings?.use24Hour !== false) return `${String(Number(match[1])).padStart(2,'0')}:${match[2]}`;
    const hour = Number(match[1]);
    const minute = match[2];
    const isPm = hour >= 12;
    const hour12 = hour % 12 || 12;
    const period = uiText(isPm ? 'pm' : 'am');
    return ACTIVE_LANGUAGE === 'en' ? `${hour12}:${minute} ${period}` : `${period} ${hour12}:${minute}`;
  }

  async moveStorageRoot(newRoot) {
    const cleanRoot = normalizeVaultPath(newRoot);
    if (!cleanRoot) throw new Error(uiText('invalidFolder'));
    if (cleanRoot === ACTIVE_STORAGE_PATHS.root) return;

    const oldPaths = { ...ACTIVE_STORAGE_PATHS };
    const nextPaths = storagePathsFromRoot(cleanRoot);
    const moves = [
      [oldPaths.dataFolder, nextPaths.dataFolder],
      [oldPaths.dailyFolder, nextPaths.dailyFolder],
      [oldPaths.monthlyRecordFolder, nextPaths.monthlyRecordFolder],
      [oldPaths.monthlyReviewFolder, nextPaths.monthlyReviewFolder],
      [oldPaths.taskHubPath, nextPaths.taskHubPath],
      [oldPaths.routineOverviewPath, nextPaths.routineOverviewPath],
      [oldPaths.routinePath, nextPaths.routinePath]
    ].filter(([from]) => this.app.vault.getAbstractFileByPath(from));

    for (const [, target] of moves) {
      if (this.app.vault.getAbstractFileByPath(target)) throw new Error(uiText('moveStorageCollision'));
    }

    await ensureVaultFolderPath(this.app, cleanRoot);
    for (const [from, target] of moves) {
      const file = this.app.vault.getAbstractFileByPath(from);
      if (!file) continue;
      const parentPath = target.includes('/') ? target.slice(0, target.lastIndexOf('/')) : '';
      if (parentPath) await ensureVaultFolderPath(this.app, parentPath);
      await this.app.fileManager.renameFile(file, target);
    }

    applyRuntimeStoragePaths(nextPaths);
    this.storageSettings = { ...ACTIVE_STORAGE_PATHS };
    await this.saveCategorySettings();
    this.monthCache.clear();
    this.refreshViews();
  }

  async persistV08SettingsMigration(saved={}) {
    const alreadyReady = Number(saved.settingsSchemaVersion || 0) >= SETTINGS_SCHEMA_VERSION &&
      saved.storage && saved.taxonomy?.categories;
    const onboardingReady = saved.onboardingCompleted === true &&
      Number(saved.onboardingVersion || 0) >= ONBOARDING_SCHEMA_VERSION;
    if (alreadyReady && onboardingReady) return;

    const extra = {
      settingsSchemaVersion:SETTINGS_SCHEMA_VERSION,
      storageSchemaVersion:1,
      taxonomyIdSchemaVersion:TAXONOMY_ID_SCHEMA_VERSION,
      onboardingCompleted:true,
      onboardingVersion:ONBOARDING_SCHEMA_VERSION,
      installProfile:this.isLegacyInstall ? 'legacy-migrated' : 'public',
      legacyTaxonomyRescueVersion:this.legacyTaxonomyRepaired
        ? LEGACY_TAXONOMY_RESCUE_VERSION
        : Number(saved?.legacyTaxonomyRescueVersion || 0)
    };
    if (!this.needsLegacyTaxonomyMigration) {
      extra.taxonomySchemaVersion = TAXONOMY_SCHEMA_VERSION;
      extra.categorySchemaVersion = TAXONOMY_SCHEMA_VERSION;
    }
    await this.saveCategorySettings(extra);
  }

  applyFirstRunPreset(presetKey='default') {
    const preset = getPublicSetupPreset(presetKey);
    CATEGORIES.splice(0, CATEGORIES.length, ...preset.categories);
    for (const key of Object.keys(GROUP_PRESETS)) delete GROUP_PRESETS[key];
    for (const category of preset.categories) {
      GROUP_PRESETS[category] = [...(preset.groups[category] || ['기타'])];
      ensureCategoryRuntime(category);
    }

    this.inactiveCategories = new Set();
    this.inactiveGroups = {};
    this.categoryIds = new Map();
    this.groupIds = new Map();
    for (const category of CATEGORIES) {
      this.ensureCategoryIdentity(category);
      for (const group of GROUP_PRESETS[category] || ['기타']) this.ensureGroupIdentity(category, group);
    }
    return preset;
  }

  async completeFirstRunSetup(root, presetKey='default') {
    const cleanRoot = normalizeVaultPath(root) || DEFAULT_STORAGE_ROOT;
    if (cleanRoot !== ACTIVE_STORAGE_PATHS.root) await this.moveStorageRoot(cleanRoot);
    else { applyRuntimeStoragePaths(storagePathsFromRoot(cleanRoot)); this.storageSettings = { ...ACTIVE_STORAGE_PATHS }; }
    this.applyFirstRunPreset(presetKey);

    for (const folder of [
      ACTIVE_STORAGE_PATHS.root,
      DATA_FOLDER,
      DAILY_FOLDER,
      MONTHLY_RECORD_FOLDER,
      MONTHLY_REVIEW_FOLDER
    ]) {
      await this.ensureFolder(folder);
    }

    await this.saveCategorySettings({
      settingsSchemaVersion:SETTINGS_SCHEMA_VERSION,
      storageSchemaVersion:1,
      taxonomyIdSchemaVersion:TAXONOMY_ID_SCHEMA_VERSION,
      taxonomySchemaVersion:TAXONOMY_SCHEMA_VERSION,
      categorySchemaVersion:TAXONOMY_SCHEMA_VERSION,
      onboardingCompleted:true,
      onboardingVersion:ONBOARDING_SCHEMA_VERSION,
      installProfile:'public'
    });

    this.installProfile = 'public';
    this.firstRunPending = false;
    this.isLegacyInstall = false;
    this.needsLegacyTaxonomyMigration = false;
    this.monthCache.clear();
    this.refreshViews();
  }

  async hasUserTodoData() {
    const files = this.app.vault.getFiles().filter(file =>
      file?.path?.endsWith('.md') && (
        file.path.startsWith(`${DATA_FOLDER}/`) ||
        file.path === ROUTINE_PATH
      )
    );
    for (const file of files) {
      try {
        const content = await this.app.vault.cachedRead(file);
        if (/^- \[[ xX]\] /m.test(content)) return true;
        if (file.path === ROUTINE_PATH && /\[routineId::|^##\s+/m.test(content)) return true;
      } catch (_) {}
    }
    return false;
  }

  async openStartGuideFromSettings() {
    return this.openOnboardingGuideModal({ existing:true, replay:true });
  }

  async openFirstRunSetupModal({ preview=false } = {}) {
    const isPreview=preview;
    if(this.firstRunModalOpen)return;
    const { Modal }=require('obsidian');
    const plugin=this;
    const modal=enableModalMotion(new Modal(this.app));
    modal.modalEl?.addClass('momo-first-run-shell');
    this.firstRunModalOpen=true;
    let page=0;
    let selectedPreset='default';

    modal.onOpen=()=>{
      const {contentEl}=modal;
      contentEl.empty();
      contentEl.addClass('momo-first-run-modal','momo-setup-wizard');

      const top=contentEl.createDiv({cls:'momo-setup-top'});
      top.createDiv({text:uiText('setupWizardHeader'),cls:'momo-setup-kicker'});
      const step=top.createDiv({cls:'momo-setup-step'});

      const title=contentEl.createEl('h2',{cls:'momo-setup-title'});
      const body=contentEl.createDiv({cls:'momo-setup-body'});
      const desc=contentEl.createDiv({cls:'momo-setup-desc'});

      const footer=contentEl.createDiv({cls:'momo-setup-footer'});
      const back=footer.createEl('button',{text:uiText('guideBack')});
      const next=footer.createEl('button',{cls:'mod-cta'});

      const storageInput=document.createElement('input');
      storageInput.className='momo-first-run-input momo-setup-storage-input';
      storageInput.type='text';
      storageInput.spellcheck=false;
      storageInput.value=ACTIVE_STORAGE_PATHS.root||DEFAULT_STORAGE_ROOT;
      storageInput.setAttribute('aria-label',uiText('storageFolderLabel'));
      storageInput.disabled=isPreview;

      const setDescription=(line1,line2)=>{
        desc.empty();
        desc.createDiv({text:line1});
        desc.createDiv({text:line2});
      };

      const presetSummary=()=>getPublicSetupPreset(selectedPreset).title;

      const draw=()=>{
        body.empty();
        step.setText(uiText('setupWizardStep',{current:page+1}));
        back.style.visibility=page===0?'hidden':'visible';

        if(page===0){
          title.setText(uiText('setupStorageTitle'));
          const card=body.createDiv({cls:'momo-setup-card momo-setup-storage-card'});
          card.createDiv({text:uiText('storageFolderLabel'),cls:'momo-setup-field-label'});
          card.appendChild(storageInput);
          setDescription(uiText('setupStorageLine1'),uiText('setupStorageLine2'));
          next.setText(uiText('setupNext'));
        }else if(page===1){
          title.setText(uiText('setupTemplateTitle'));
          const list=body.createDiv({cls:'momo-setup-preset-grid'});
          for(const key of ['default','minimal','blank']){
            const preset=getPublicSetupPreset(key);
            const button=list.createEl('button',{cls:`momo-setup-preset-card ${key===selectedPreset?'is-selected':''}`});
            button.disabled=isPreview;
            button.createDiv({text:preset.title,cls:'momo-setup-preset-title'});
            button.createDiv({text:preset.categories.join(' · '),cls:'momo-setup-preset-categories'});
            button.onclick=(ev)=>{ev.preventDefault();if(isPreview)return;selectedPreset=key;draw();};
          }
          setDescription(uiText('setupTemplateLine1'),uiText('setupTemplateLine2'));
          next.setText(uiText('setupNext'));
        }else{
          title.setText(uiText('setupReadyTitle'));
          const summary=body.createDiv({cls:'momo-setup-summary'});
          for(const [label,value] of [[uiText('setupStorageSummary'),normalizeVaultPath(storageInput.value)||DEFAULT_STORAGE_ROOT],[uiText('setupTemplateSummary'),presetSummary()]]){
            const row=summary.createDiv({cls:'momo-setup-summary-row'});
            row.createSpan({text:label});
            row.createSpan({text:value});
          }
          setDescription('', '');
          next.setText(uiText('firstTask'));
        }
      };

      back.onclick=()=>{if(page>0){page--;draw();}};
      next.onclick=async()=>{
        if(page===0){
          const root=normalizeVaultPath(storageInput.value);
          if(!root){new Notice(uiText('invalidFolder'));storageInput.focus();return;}
          page=1;draw();return;
        }
        if(page===1){page=2;draw();return;}
        if(isPreview){modal.close();return;}
        const root=normalizeVaultPath(storageInput.value)||DEFAULT_STORAGE_ROOT;
        next.disabled=true;
        try{
          await plugin.completeFirstRunSetup(root,selectedPreset);
          plugin.firstRunPending=false;
          plugin.setupSuggested=false;
          modal.close();
          await plugin.activateView();
          window.setTimeout(()=>plugin.openAddTaskModal(todaySeoul(),null,null),100);
        }catch(error){
          console.error('Momoan Todo setup:',error);
          new Notice(error?.message||String(error));
          next.disabled=false;
        }
      };
      draw();
    };
    modal.onClose=()=>{this.firstRunModalOpen=false;};
    modal.open();
  }

  openOnboardingGuideModal({ existing=false, replay=false } = {}) {
    const { Modal }=require('obsidian');
    const modal=enableModalMotion(new Modal(this.app));
    modal.modalEl?.addClass('momo-onboarding-guide-shell');
    // v0.9.24 — canonical onboarding layout rebuild: independent toggle row + fixed visual coordinate system.
    const slides=[
      {title:uiText('guideOverviewTitle'),body:[uiText('guideOverviewLine1'),uiText('guideOverviewLine2')],type:'overview'},
      {title:uiText('guideTaskListTitle'),body:[uiText('guideTaskListLine1'),uiText('guideTaskListLine2')],type:'taskList'},
      {title:uiText('guideWelcomeTitle'),body:[uiText('guideStructureLine1'),uiText('guideStructureLine2')],type:'structure'},
      {title:uiText('guideRoutineConceptTitle'),body:[uiText('guideRoutineConceptLine1'),uiText('guideRoutineConceptLine2')],type:'routine'},
      {title:uiText('guideCalendarTitle'),body:[uiText('guideCalendarLine1'),uiText('guideCalendarLine2')],type:'calendarLegend'},
      {title:uiText('guideManageTitle'),body:[uiText('guideManageLine1'),uiText('guideManageLine2')],type:'manage'},
      {title:uiText('guideMonthlyTitle'),body:[uiText('guideMonthlyLine1'),uiText('guideMonthlyLine2')],type:'review'}
    ];
    if(!existing){
      slides.push({title:uiText('guideSetupIntroTitle'),body:[uiText('guideSetupIntroLine1'),uiText('guideSetupIntroLine2')],type:'setupIntro'});
    }
    let index=0;
    const demo=localizedPresetData('default');
    const demoCat=ACTIVE_LANGUAGE==='ko'?'업무':(demo.categories[0]||uiText('category'));
    const demoGroup=ACTIVE_LANGUAGE==='ko'?'기타':((demo.groups[demoCat]||[]).slice(-1)[0]||uiText('group'));
    const demoTask=ACTIVE_LANGUAGE==='ko'?'회의 자료 정리':(ACTIVE_LANGUAGE==='ja'?'会議資料を整理':ACTIVE_LANGUAGE==='zh'?'整理会议资料':'Organize meeting notes');
    const demoTask2=ACTIVE_LANGUAGE==='ko'?'레드마인 일감 확인':(ACTIVE_LANGUAGE==='ja'?'Redmine の課題を確認':ACTIVE_LANGUAGE==='zh'?'查看 Redmine 任务':'Check Redmine tasks');

    const makeTaskRow=(host,title=demoTask)=>{
      const row=host.createDiv({cls:'momo-guide-app-task'});
      row.createSpan({cls:'momo-guide-app-check'});
      row.createSpan({text:title,cls:'momo-guide-app-task-title'});
      const more=row.createSpan({cls:'momo-guide-app-more'});setIcon(more,'ellipsis');
      return row;
    };
    const makeMiniCalendar=(host)=>{
      const cal=host.createDiv({cls:'momo-guide-overview-calendar'});
      cal.createDiv({text:uiText('guideExampleMonth'),cls:'momo-guide-overview-month'});
      const week=cal.createDiv({cls:'momo-guide-overview-week'});
      const heads=ACTIVE_LANGUAGE==='ko'?['월','화','수','목','금','토','일']:ACTIVE_LANGUAGE==='ja'?['月','火','水','木','金','土','日']:ACTIVE_LANGUAGE==='zh'?['一','二','三','四','五','六','日']:['M','T','W','T','F','S','S'];
      heads.forEach(x=>week.createSpan({text:x}));
      const grid=cal.createDiv({cls:'momo-guide-overview-days'});
      ['',1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,'','','',''].forEach(d=>{const x=grid.createSpan({text:d===''?'':String(d),cls:d===10?'is-selected':''});if(d===10)x.setAttr('aria-label',uiText('guideSelectDateHint'));});
      return cal;
    };
    const makeDateTaskPane=(host,full=false)=>{
      const pane=host.createDiv({cls:`momo-guide-date-pane ${full?'is-full':''}`});
      const head=pane.createDiv({cls:'momo-guide-date-pane-head'});
      const left=head.createDiv({cls:'momo-guide-date-info'});
      left.createDiv({text:uiText('guideExampleDate'),cls:'momo-guide-date-title'});
      const actions=head.createDiv({cls:'momo-guide-date-actions'});
      for(const [icon,label] of [['plus',uiText('guideAddTask')],['repeat-2',uiText('guideRoutine')],['menu',uiText('guideClassify')]]){const it=actions.createDiv({cls:'momo-guide-date-action'});const ic=it.createSpan({cls:'momo-guide-date-action-icon'});setIcon(ic,icon);if(full)it.createSpan({text:label});}
      const toggles=pane.createDiv({cls:'momo-guide-date-toggles'});
      for(const label of [uiText('completed'),uiText('classification')]){const it=toggles.createSpan({cls:'momo-guide-date-toggle'});it.createSpan({text:label});it.createSpan({cls:'momo-guide-toggle is-on'});}
      const list=pane.createDiv({cls:'momo-guide-date-list'});
      const cat=list.createDiv({cls:'momo-guide-date-category'});cat.createSpan({cls:'momo-guide-app-category-dot'});cat.createSpan({text:demoCat});
      list.createDiv({text:demoGroup,cls:'momo-guide-date-group'});
      makeTaskRow(list,demoTask);if(full)makeTaskRow(list,demoTask2);
      return pane;
    };
    const makePaneLabel=(host,icon,label)=>{
      const row=host.createDiv({cls:'momo-guide-pane-label'});
      const ic=row.createSpan({cls:'momo-guide-pane-label-icon'});setIcon(ic,icon);
      row.createSpan({text:label});
      return row;
    };
    const makeReview=(host)=>{
      const review=host.createDiv({cls:'momo-guide-review-panel'});
      const items=[
        [uiText('lastMonthChange'),'+4','trending-up'],
        [uiText('focusCategory'),`${demoCat} · 18`,'folder'],
        [uiText('focusGroup'),`${demoGroup} · 11`,'layers-3']
      ];
      const actions=review.createDiv({cls:'momo-guide-review-actions'});
      const write=actions.createSpan({cls:'momo-guide-review-action'});const writeIcon=write.createSpan({cls:'momo-guide-review-action-icon'});setIcon(writeIcon,'pencil');write.createSpan({text:uiText('reviewWrite')});
      const save=actions.createSpan({cls:'momo-guide-review-action'});const saveIcon=save.createSpan({cls:'momo-guide-review-action-icon'});setIcon(saveIcon,'image');save.createSpan({text:uiText('imageSave')});
      for(const [label,value,icon] of items){
        const row=review.createDiv({cls:'momo-guide-review-row'});
        const lead=row.createSpan({cls:'momo-guide-review-label'});const ic=lead.createSpan({cls:'momo-guide-review-icon'});setIcon(ic,icon);lead.createSpan({text:label});
        row.createSpan({text:value,cls:'momo-guide-review-value'});
      }
    };

    const renderIllustration=(host,type)=>{
      host.empty();host.addClass('momo-guide-illustration');host.dataset.type=type;
      if(type==='overview'){
        const frame=host.createDiv({cls:'momo-guide-overview-frame'});
        const left=frame.createDiv({cls:'momo-guide-overview-side'});makePaneLabel(left,'calendar-days',uiText('guideCalendarPane'));makeMiniCalendar(left);
        frame.createDiv({cls:'momo-guide-overview-divider',attr:{'aria-hidden':'true'}});
        const right=frame.createDiv({cls:'momo-guide-overview-side'});makePaneLabel(right,'list-todo',uiText('guideTaskPane'));makeDateTaskPane(right,false);
      }else if(type==='taskList'){
        const wrap=host.createDiv({cls:'momo-guide-task-list-wrap'});makeDateTaskPane(wrap,true);
      }else if(type==='structure'){
        const list=host.createDiv({cls:'momo-guide-structure-list'});
        const rows=[[uiText('guideCategoryLabel'),'category','folder'],[uiText('guideGroupLabel'),'group','layers-3'],[uiText('guideTaskLabel'),'task','circle-check-big']];
        rows.forEach(([label,kind,icon])=>{
          const row=list.createDiv({cls:'momo-guide-structure-row'});
          const labelWrap=row.createDiv({cls:'momo-guide-structure-label'});const labelIcon=labelWrap.createSpan({cls:'momo-guide-structure-label-icon'});setIcon(labelIcon,icon);labelWrap.createSpan({text:label});
          if(kind==='category'){const x=row.createDiv({cls:'momo-guide-app-category'});x.createSpan({cls:'momo-guide-app-category-dot'});x.createSpan({text:demoCat});}else if(kind==='group'){row.createDiv({text:demoGroup,cls:'momo-guide-app-group'});}else makeTaskRow(row,demoTask);
        });
      }else if(type==='routine'){
        const r=host.createDiv({cls:'momo-guide-routine-concept'});
        const card=r.createDiv({cls:'momo-guide-routine-card'});const ico=card.createSpan({cls:'momo-guide-routine-icon'});setIcon(ico,'repeat-2');const copy=card.createDiv();copy.createDiv({text:uiText('guideRoutineExample'),cls:'momo-guide-routine-example'});copy.createDiv({text:uiText('routineFrequent'),cls:'momo-guide-routine-meta'});
        const flow=r.createDiv({cls:'momo-guide-routine-visual-flow'});
        const makeRoutineExample=(side,label,iconName,resultLabel,resultIcon,isPreview=false)=>{
          const example=flow.createDiv({cls:`momo-guide-routine-flow-side ${side}`});
          const visual=example.createDiv({cls:'momo-guide-routine-simple-flow'});
          const when=visual.createDiv({cls:'momo-guide-routine-example-chip'});const whenIcon=when.createSpan({cls:'momo-guide-routine-example-icon'});setIcon(whenIcon,iconName);when.createSpan({text:label});
          const arrow=visual.createSpan({cls:'momo-guide-routine-flow-arrow'});setIcon(arrow,'arrow-right');
          const result=visual.createDiv({cls:`momo-guide-routine-outcome ${isPreview?'is-preview':'is-actual'}`});
          if(isPreview){result.createSpan({text:'·',cls:'momo-guide-routine-preview-dot'});}else{const ri=result.createSpan({cls:'momo-guide-routine-result-icon'});setIcon(ri,resultIcon);}
          result.createSpan({text:resultLabel});
        };
        makeRoutineExample('is-near',uiText('guideRoutineNearExample'),'calendar-check',uiText('guideRoutineActual'),'list-checks',false);
        makeRoutineExample('is-far',uiText('guideRoutineFarExample'),'calendar-days',uiText('guideRoutinePreview'),'circle',true);
      }else if(type==='calendarLegend'){
        const grid=host.createDiv({cls:'momo-guide-app-calendar-demo'});const data=[['✓','1',uiText('guideAllDone')],['3','2',uiText('guideRemaining')],['·','3',uiText('guidePreviewDot')],['','4',uiText('guideBlank')]];
        for(const [mark,day,label] of data){const item=grid.createDiv({cls:'momo-guide-calendar-demo-item'});const cell=item.createDiv({cls:'momo-guide-calendar-demo-cell'});cell.createDiv({text:mark||' ',cls:'momo-guide-calendar-demo-mark'});cell.createDiv({text:day,cls:'momo-guide-calendar-demo-day'});item.createDiv({text:label,cls:'momo-guide-calendar-demo-label'});}
      }else if(type==='manage'){
        const manage=host.createDiv({cls:'momo-guide-interaction-demo'});
        const live=manage.createDiv({cls:'momo-guide-live-task-card'});makeTaskRow(live,demoTask);
        const list=manage.createDiv({cls:'momo-guide-interaction-list'});
        const items=[
          [uiText('guideSingleClick'),uiText('guideSingleAction'),'mouse-pointer-click','ellipsis',''],
          [uiText('guideDoubleClick'),uiText('guideDoubleAction'),'mouse-pointer-click','pencil','2×'],
          [uiText('guideDrag'),uiText('guideDragAction'),'move-vertical','grip-vertical','']
        ];
        const gestureLabels=[];
        const actionLabels=[];
        for(const [gesture,action,gestureIcon,actionIcon,badge] of items){
          const row=list.createDiv({cls:'momo-guide-interaction-row-simple'});
          const left=row.createDiv({cls:'momo-guide-interaction-side is-gesture'});
          const gestureMark=left.createSpan({cls:'momo-guide-interaction-mark'});
          const gi=gestureMark.createSpan({cls:'momo-guide-interaction-icon'});setIcon(gi,gestureIcon);
          if(badge)gestureMark.createSpan({text:badge,cls:'momo-guide-interaction-badge'});
          gestureLabels.push(left.createSpan({text:gesture,cls:'momo-guide-interaction-gesture'}));
          const arrow=row.createSpan({cls:'momo-guide-interaction-arrow'});setIcon(arrow,'arrow-right');
          const right=row.createDiv({cls:'momo-guide-interaction-side is-action'});
          const actionMark=right.createSpan({cls:'momo-guide-interaction-mark'});
          const ai=actionMark.createSpan({cls:'momo-guide-interaction-icon is-action'});setIcon(ai,actionIcon);
          actionLabels.push(right.createSpan({text:action,cls:'momo-guide-interaction-action'}));
        }
        // Keep each icon column vertically aligned while centering the *visible*
        // icon + label group inside its half. A fixed 100px text track made short
        // translations look left-heavy even though the CSS boxes were centered.
        const syncInteractionTextTracks=()=>{
          if(!list.isConnected)return;
          const measure=(nodes,cap)=>Math.min(cap,Math.max(0,...nodes.map(el=>Math.ceil(el.getBoundingClientRect().width))));
          list.style.setProperty('--momo-guide-gesture-text-width',`${measure(gestureLabels,88)}px`);
          list.style.setProperty('--momo-guide-action-text-width',`${measure(actionLabels,88)}px`);
        };
        window.requestAnimationFrame(()=>{syncInteractionTextTracks();window.requestAnimationFrame(syncInteractionTextTracks);});
      }else if(type==='review'){
        const wrap=host.createDiv({cls:'momo-guide-review-wrap'});makeReview(wrap);
      }else if(type==='setupIntro'){
        const wrap=host.createDiv({cls:`momo-guide-setup-intro ${existing?'is-existing':''}`});
        if(existing){
          wrap.createDiv({text:uiText('guideConfigured'),cls:'momo-guide-setup-badge'});
          const row=wrap.createDiv({cls:'momo-guide-setup-current'});row.createSpan({text:uiText('guideCurrentStorageShort')});row.createSpan({text:ACTIVE_STORAGE_PATHS.root||DEFAULT_STORAGE_ROOT});
        }else{
          for(const [n,label,icon] of [['1',uiText('guideSetupStorageShort'),'folder'],['2',uiText('guideSetupTemplateShort'),'list-tree'],['3',uiText('guideSetupFirstTaskShort'),'plus']]){const row=wrap.createDiv({cls:'momo-guide-setup-step-row'});row.createSpan({text:n,cls:'momo-guide-setup-num'});const ic=row.createSpan({cls:'momo-guide-setup-icon'});setIcon(ic,icon);row.createSpan({text:label});}
        }
      }
    };

    modal.onOpen=()=>{
      const {contentEl}=modal;contentEl.empty();contentEl.addClass('momo-onboarding-guide-modal');contentEl.addClass('momo-guide-v935');
      const skip=existing ? null : contentEl.createEl('button',{text:uiText('guideSkip'),cls:'momo-guide-skip momo-guide-skip-floating'});
      const title=contentEl.createEl('h2',{cls:'momo-guide-title'});const visual=contentEl.createDiv({cls:'momo-guide-visual'});const body=contentEl.createDiv({cls:'momo-guide-body'});const dots=contentEl.createDiv({cls:'momo-guide-dots'});
      const foot=contentEl.createDiv({cls:'momo-guide-footer'});const back=foot.createEl('button',{cls:'momo-guide-nav momo-guide-nav-back'});const step=foot.createSpan({cls:'momo-guide-step'});const next=foot.createEl('button',{cls:'momo-guide-nav momo-guide-nav-next'});
      const goSetup=()=>{modal.close();if(!existing)window.setTimeout(()=>this.openFirstRunSetupModal({preview:false}),80);};
      const setNav=(button,icon,label)=>{button.empty();setIcon(button,icon);button.setAttr('aria-label',label);button.setAttr('title',label);};
      if(skip) skip.onclick=goSetup;
      const draw=()=>{const slide=slides[index];title.setText(slide.title);renderIllustration(visual,slide.type);body.empty();slide.body.forEach(line=>body.createDiv({text:line}));dots.empty();for(let i=0;i<slides.length;i++)dots.createSpan({cls:`momo-guide-dot ${i===index?'is-active':''}`});step.setText(uiText('guideStep',{current:index+1,total:slides.length}));back.style.visibility=index===0?'hidden':'visible';setNav(back,'chevron-left',uiText('guideBack'));const nextLabel=index===slides.length-1?(existing?uiText('guideClose'):uiText('guideStartSetup')):uiText('guideNext');setNav(next,index===slides.length-1?'check':'chevron-right',nextLabel);};
      back.onclick=()=>{if(index>0){index--;draw();}};
      next.onclick=()=>{if(index<slides.length-1){index++;draw();return;}if(existing)modal.close();else goSetup();};
      let startX=null;visual.addEventListener('touchstart',e=>{startX=e.touches?.[0]?.clientX??null;},{passive:true});visual.addEventListener('touchend',e=>{if(startX==null)return;const end=e.changedTouches?.[0]?.clientX??startX;const dx=end-startX;startX=null;if(Math.abs(dx)<45)return;if(dx<0&&index<slides.length-1){index++;draw();}else if(dx>0&&index>0){index--;draw();}},{passive:true});
      draw();
    };
    modal.open();
  }

  async activateView(reveal = true) {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      // 투두리스트는 메인 작업 영역의 독립 탭으로 연다.
      leaf = this.app.workspace.getLeaf(true);
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    if (reveal) this.app.workspace.revealLeaf(leaf);
  }

  async cleanupDeprecatedWidgetNotes() {
    // v0.9.56: remove only files that v0.9.55 itself generated. A user-created
    // note with the same filename is left untouched unless it contains our
    // exact auto-generation marker.
    const candidates = this.app.vault.getMarkdownFiles().filter(file =>
      file?.name === DEPRECATED_WIDGET_NOTE_FILENAME
    );
    for (const file of candidates) {
      try {
        const content = await this.app.vault.cachedRead(file);
        if (!content.includes(DEPRECATED_WIDGET_MARKER)) continue;
        await this.app.vault.delete(file);
      } catch (error) {
        console.error('Momoan Todo 구형 위젯 파일 삭제:', file?.path, error);
      }
    }
  }

  async runRoutineIntegrityPass({ force=false }={}) {
    const today = todaySeoul();
    const dateChanged = this.lastRoutineRollDate !== today;
    const hasVaultChanges = this._routineIntegrityRevision !== this._routineIntegrityCheckedRevision;
    if (!force && !dateChanged && !hasVaultChanges) return false;

    this.lastRoutineRollDate = today;
    // Usually one pass is enough. A second pass is allowed when we joined an
    // older in-flight ensure, or when a relevant Vault event arrived while the
    // first scan was running. This closes the same-day sync race without making
    // normal focus events expensive.
    for (let pass = 0; pass < 2; pass++) {
      const revisionAtStart = this._routineIntegrityRevision;
      const joinedOlderPass = Boolean(this._routineEnsurePromise);
      await this.ensureRoutineOccurrences();

      if (!joinedOlderPass && this._routineIntegrityRevision === revisionAtStart) {
        this._routineIntegrityCheckedRevision = revisionAtStart;
        return true;
      }
    }

    // Something changed throughout both passes. Leave the newer revision
    // unchecked so the next focus/15-minute/hourly hook retries safely.
    return true;
  }

  async checkRoutineDayRollover() {
    // v0.9.43: focus/15-minute hooks only perform the expensive full routine
    // integrity pass after a date rollover or a relevant Vault file change.
    return await this.runRoutineIntegrityPass();
  }

  recordUndoMutation(path, beforeText, afterText) {
    if (!this._historyTransaction || this._historyApplying) return;
    const cleanPath = normalizeVaultPath(path);
    if (!cleanPath) return;
    const before = String(beforeText ?? '');
    const after = String(afterText ?? '');
    const existing = this._historyTransaction.files.get(cleanPath);
    if (existing) existing.afterText = after;
    else this._historyTransaction.files.set(cleanPath, { path:cleanPath, beforeText:before, afterText:after });
  }

  canUndo() {
    return !this._historyApplying && !this._historyTransaction && this.undoStack.length > 0;
  }

  canRedo() {
    return !this._historyApplying && !this._historyTransaction && this.redoStack.length > 0;
  }

  updateHistoryControls() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      leaf.view?.updateHistoryControls?.();
    }
  }

  async runUndoableAction(label, work) {
    if (typeof work !== 'function') return null;
    if (this._historyApplying || this._historyTransaction) return await work();

    const transaction = { label:String(label || 'change'), files:new Map() };
    this._historyTransaction = transaction;
    try {
      return await work();
    } finally {
      if (this._historyTransaction === transaction) this._historyTransaction = null;
      const files = [...transaction.files.values()].filter(entry => entry.beforeText !== entry.afterText);
      if (files.length) {
        this.undoStack.push({ label:transaction.label, files });
        if (this.undoStack.length > this._historyLimit) this.undoStack.splice(0, this.undoStack.length - this._historyLimit);
        this.redoStack.length = 0;
      }
      this.updateHistoryControls();
    }
  }

  async historyStateMatches(transaction, direction) {
    await waitForPendingFileMutations();
    const expectedKey = direction === 'undo' ? 'afterText' : 'beforeText';
    for (const entry of transaction.files) {
      const file = this.app.vault.getAbstractFileByPath(entry.path);
      if (!file) return false;
      const current = await this.app.vault.read(file);
      if (String(current ?? '') !== entry[expectedKey]) return false;
    }
    return true;
  }

  async applyHistoryEntry(entry, direction) {
    const expected = direction === 'undo' ? entry.afterText : entry.beforeText;
    const target = direction === 'undo' ? entry.beforeText : entry.afterText;
    let matched = false;
    const outcome = await mutateTextFile(this.app, entry.path, currentText => {
      if (String(currentText ?? '') !== expected) {
        matched = false;
        return currentText;
      }
      matched = true;
      return target;
    });
    return matched && outcome.changed;
  }

  async applyHistoryTransaction(transaction, direction) {
    if (!transaction?.files?.length) return false;
    if (!(await this.historyStateMatches(transaction, direction))) return false;

    const applied = [];
    for (const entry of transaction.files) {
      const ok = await this.applyHistoryEntry(entry, direction);
      if (!ok) {
        const rollbackDirection = direction === 'undo' ? 'redo' : 'undo';
        for (const rollbackEntry of applied.reverse()) {
          try { await this.applyHistoryEntry(rollbackEntry, rollbackDirection); }
          catch (error) { console.error('Momoan Todo · undo rollback failed:', error); }
        }
        return false;
      }
      applied.push(entry);
    }
    return true;
  }

  clearHistoryForConflict() {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.updateHistoryControls();
    new Notice(uiText('historyConflict'));
  }

  async undoLastChange() {
    if (!this.canUndo()) return false;
    const transaction = this.undoStack[this.undoStack.length - 1];
    this._historyApplying = true;
    this.updateHistoryControls();
    try {
      const ok = await this.applyHistoryTransaction(transaction, 'undo');
      if (!ok) { this.clearHistoryForConflict(); return false; }
      this.undoStack.pop();
      this.redoStack.push(transaction);
      for (const entry of transaction.files) this.invalidateFile(entry.path);
      this.refreshViews();
      new Notice(uiText('undoDone'));
      return true;
    } finally {
      this._historyApplying = false;
      this.updateHistoryControls();
    }
  }

  async redoLastChange() {
    if (!this.canRedo()) return false;
    const transaction = this.redoStack[this.redoStack.length - 1];
    this._historyApplying = true;
    this.updateHistoryControls();
    try {
      const ok = await this.applyHistoryTransaction(transaction, 'redo');
      if (!ok) { this.clearHistoryForConflict(); return false; }
      this.redoStack.pop();
      this.undoStack.push(transaction);
      for (const entry of transaction.files) this.invalidateFile(entry.path);
      this.refreshViews();
      new Notice(uiText('redoDone'));
      return true;
    } finally {
      this._historyApplying = false;
      this.updateHistoryControls();
    }
  }

  setSelectedDate(date) {
    this.selectedDate = date;
    this.refreshViews();
  }

  invalidateFile(path) {
    const m = path.match(/(\d{4}-\d{2})\.md$/);
    if (m) this.monthCache.delete(m[1]);
    else this.monthCache.clear();
  }

  refreshViews() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      if (leaf.view?.render) leaf.view.render();
    }
  }

  refreshMonthlyReviewViews() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      if (leaf.view?.monthlyReviewOpen && leaf.view?.render) leaf.view.render();
    }
  }

  runQuickAdd(date = this.selectedDate, category = null, group = null) {
    this.openAddTaskModal(date, category, group).catch(err => {
      console.error('할 일 추가:', err);
      new Notice(uiText('addTaskFailed'));
    });
  }

  async openAddTaskModal(date = this.selectedDate, category = null, group = null) {
    const { Modal } = require('obsidian');
    const plugin = this;
    const modal = enableModalMotion(new Modal(this.app));

    modal.onOpen = () => {
      const { contentEl } = modal;
      contentEl.empty();
      contentEl.addClass('momo-task-editor-modal');
      contentEl.addClass('momo-task-add-modal');
      contentEl.createEl('h2', { text:uiText('addTask') });

      const form = contentEl.createDiv({ cls:'momo-task-editor-form' });
      const makeRow = (label) => {
        const row = form.createDiv({ cls:'momo-task-editor-row' });
        row.createDiv({ text:label, cls:'momo-task-editor-label' });
        return row.createDiv({ cls:'momo-task-editor-control' });
      };

      const title = stabilizeTextInput(makeRow(uiText('title')).createEl('input'));
      title.type = 'text';
      title.placeholder = uiText('titlePlaceholder');
      const restoreTitleFocus = guardModalPrimaryTextInput(title, modal);

      let selectedCategory = CATEGORIES.includes(category) ? category : (CATEGORIES[0] || '기타');
      const presetGroups = GROUP_PRESETS[selectedCategory] || ['기타'];
      let selectedGroup = group && presetGroups.includes(group) ? group : '기타';

      const categoryButton = createPillField(makeRow(uiText('category')), selectedCategory);
      const groupButton = createPillField(makeRow(uiText('group')), selectedGroup);

      categoryButton.onclick = async () => {
        const picked = await plugin.openCategoryChoiceModal(uiText('chooseCategory'), selectedCategory);
        if (picked === null) return;
        selectedCategory = picked;
        selectedGroup = (GROUP_PRESETS[picked] || [])[0] || '기타';
        categoryButton.setText(picked);
        groupButton.setText(selectedGroup);
        if (!title.value.trim()) requestAnimationFrame(restoreTitleFocus);
      };

      groupButton.onclick = async () => {
        const picked = await plugin.openGroupChoiceModal(uiText('chooseGroup'), selectedCategory, selectedGroup);
        if (picked === null) return;
        selectedGroup = picked;
        groupButton.setText(selectedGroup);
        if (!title.value.trim()) requestAnimationFrame(restoreTitleFocus);
      };

      const dateControl = createDatePicker(plugin.app, makeRow(uiText('date')), date || plugin.selectedDate || todaySeoul());
      const timeControl = createTimeSelect(plugin.app, makeRow(uiText('time')), '');

      const details = contentEl.createEl('details', { cls:'momo-task-add-details' });
      const summary = details.createEl('summary', { text:uiText('details') });
      const detailsBody = details.createDiv({ cls:'momo-task-add-details-body' });
      const locationRow = detailsBody.createDiv({ cls:'momo-task-editor-row' });
      locationRow.createDiv({ text:uiText('location'), cls:'momo-task-editor-label' });
      const locationControl = locationRow.createDiv({ cls:'momo-task-editor-control' });
      const location = stabilizeTextInput(locationControl.createEl('input'));
      location.type = 'text';
      location.placeholder = uiText('optional');

      const buttons = contentEl.createDiv({ cls:'momo-task-editor-buttons' });
      const spacer = buttons.createDiv({ cls:'momo-routine-editor-spacer' });
      const cancel = buttons.createEl('button', { text:uiText('cancel') });
      const save = buttons.createEl('button', { text:uiText('add'), cls:'mod-cta' });
      cancel.onclick = () => modal.close();

      save.onclick = async () => {
        const name = title.value.trim();
        if (!name) {
          new Notice(uiText('enterTitle'));
          title.focus();
          return;
        }

        const targetDate = dateControl.value || plugin.selectedDate || todaySeoul();
        const item = {
          title:name,
          category:selectedCategory || '기타',
          group:selectedGroup || '기타',
          date:targetDate,
          time:timeControl.value || null,
          location:location.value.trim() || null,
          done:false,
          suppressed:false,
          routineId:null,
          movedFrom:null
        };

        if (selectedGroup) {
          rememberGroupLocal(item.category, selectedGroup);
          await plugin.saveGroupSettings();
        }

        const path = `${DATA_FOLDER}/${targetDate.slice(0,7)}.md`;
        const line = buildTaskLine(item);
        await plugin.runUndoableAction('task-add', async () => {
          await insertTaskUnderDate(plugin.app, path, targetDate, line);
        });
        plugin.invalidateFile(path);
        modal.close();
        plugin.refreshViews();
        new Notice(uiText('taskAdded'));
      };

      enableTaskTitleEnterFlow(title, save);
      enableTaskEditorSubmitShortcut(contentEl, save);
    };

    modal.open();
  }

  async saveCategorySettings(extra={}) {
    const previous = this._settingsSaveChain || Promise.resolve();
    const current = previous.catch(() => {}).then(() => this._saveCategorySettingsNow(extra));
    this._settingsSaveChain = current.catch(() => {});
    return current;
  }

  async _saveCategorySettingsNow(extra={}) {
    const current = await this.loadData().catch(() => ({})) || {};
    const inactiveGroups = {};
    for (const category of CATEGORIES) {
      inactiveGroups[category] = [...(this.inactiveGroups?.[category] || new Set())];
    }
    const storage = this.buildStorageSettings();
    const taxonomy = this.buildTaxonomySettings();
    const general = {
      weekStart:normalizeWeekStart(this.generalSettings?.weekStart || ACTIVE_WEEK_START),
      accentColor:String(this.generalSettings?.accentColor || DEFAULT_ACCENT_COLOR),
      monthlyReviewEnabled:this.generalSettings?.monthlyReviewEnabled !== false,
      showMonthCount:this.generalSettings?.showMonthCount !== false,
      showMonthPercent:this.generalSettings?.showMonthPercent !== false,
      use24Hour:this.generalSettings?.use24Hour !== false,
      language:normalizeLanguage(this.generalSettings?.language || ACTIVE_LANGUAGE),
      holidayRegion:normalizeHolidayRegion(this.generalSettings?.holidayRegion || defaultHolidayRegionForLanguage(this.generalSettings?.language || ACTIVE_LANGUAGE)),
      weekendColorsEnabled:this.generalSettings?.weekendColorsEnabled !== false,
      customHolidays:String(this.generalSettings?.customHolidays || ''),
      autoSortPreset:normalizeAutoSortPreset(this.generalSettings?.autoSortPreset || 'quick'),
      autoSortPriorities:normalizeAutoSortPriorities(this.generalSettings?.autoSortPriorities),
      autoSortTimedPlacement:normalizeAutoSortTimedPlacement(this.generalSettings?.autoSortTimedPlacement),
      autoSortCompletedPlacement:normalizeAutoSortCompletedPlacement(this.generalSettings?.autoSortCompletedPlacement),
      autoSortRoutinePlacement:normalizeAutoSortRoutinePlacement(this.generalSettings?.autoSortRoutinePlacement)
    };
    this.generalSettings = general;
    this.settings = {
      schemaVersion:SETTINGS_SCHEMA_VERSION,
      storage,
      taxonomy,
      general
    };
    await this.saveData({
      ...current,
      ...extra,
      settingsSchemaVersion:SETTINGS_SCHEMA_VERSION,
      storageSchemaVersion:1,
      taxonomyIdSchemaVersion:TAXONOMY_ID_SCHEMA_VERSION,
      storage,
      taxonomy,
      general,

      // Compatibility mirror for v0.7.x data.json readers and safe rollback.
      categories:[...CATEGORIES],
      categoryTags:Object.fromEntries(CATEGORIES.map(category => [category, categoryTag(category)])),
      groups:Object.fromEntries(CATEGORIES.map(category => [category, [...new Set(GROUP_PRESETS[category] || [])]])),
      inactiveCategories:[...(this.inactiveCategories || new Set())],
      inactiveGroups
    });
  }

  async migrateCompactCategories(saved={}) {
    if (Number(saved.taxonomySchemaVersion || 0) >= TAXONOMY_SCHEMA_VERSION) return;

    // 이번 분류 개편은 과거 완료 기록까지 포함해 현재 정본 분류로 이관합니다.
    // 먼저 월별 데이터 파일을 직접 변환합니다.
    const files = this.app.vault.getFiles().filter(file =>
      file.path.startsWith(`${DATA_FOLDER}/`) && file.path.endsWith('.md')
    );

    for (const file of files) {
      await mutateTextFile(this.app, file, text => {
        const lines = text.split('\n');
        let currentDate = null;
        let changed = false;
        for (let i = 0; i < lines.length; i++) {
          const h = lines[i].trim().match(/^##\s+(\d{4}-\d{2}-\d{2})$/);
          if (h) { currentDate = h[1]; continue; }
          if (/^##\s+/.test(lines[i])) { currentDate = null; continue; }
          if (!currentDate || !/^- \[[ xX]\] /.test(lines[i])) continue;
          const item = parseTaskLine(lines[i], i, file.path, currentDate);
          if (!item) continue;
          const legacyMainWork = item.category === '업무' && ['메인 업무','메인업무'].includes(normalizeTaskGroup(item.group));
          const next = legacyMainWork ? { category:'업무', group:'에픽세븐' } : classifyCanonicalTaxonomy(item.category, item.group);
          const cleanedTitle = cleanLegacyTaskTitle(item.title);
          if (next.category !== item.category || normalizeTaskGroup(item.group) !== normalizeTaskGroup(next.group) || cleanedTitle !== item.title) {
            lines[i] = buildTaskLine(item, { title:cleanedTitle, category:next.category, group:next.group });
            changed = true;
          }
        }
        return changed ? lines.join('\n') : text;
      });
    }

    // 루틴 원본도 동일한 기준으로 이관합니다.
    const routines = await this.loadRoutines();
    let routineChanged = false;
    const nextRoutines = routines.map(routine => {
      const legacyMainWork = (routine.category || '기타') === '업무' &&
        ['메인 업무','메인업무'].includes(normalizeTaskGroup(routine.group));
      const next = legacyMainWork
        ? { category:'업무', group:'에픽세븐' }
        : classifyCanonicalTaxonomy(routine.category || '기타', routine.group || null);
      const cleanedTitle = cleanLegacyTaskTitle(routine.title);
      if (next.category === (routine.category || '기타') &&
          normalizeTaskGroup(next.group) === normalizeTaskGroup(routine.group) &&
          cleanedTitle === routine.title) {
        return routine;
      }
      routineChanged = true;
      return {
        ...routine,
        title:cleanedTitle,
        category:next.category,
        section:next.category,
        group:next.group
      };
    });
    if (routineChanged) await this.saveRoutines(nextRoutines);

    // 현재 정본 목록/순서를 강제로 확정한 뒤 저장합니다.
    CATEGORIES.splice(0, CATEGORIES.length, ...LEGACY_DEFAULT_CATEGORIES);
    GROUP_PRESETS['업무'] = (GROUP_PRESETS['업무'] || [])
      .filter(group => !['메인 업무','메인업무'].includes(group));
    if (!GROUP_PRESETS['업무'].includes('에픽세븐')) GROUP_PRESETS['업무'].unshift('에픽세븐');

    for (const category of CATEGORIES) ensureCategoryRuntime(category);

    await this.saveCategorySettings({
      taxonomySchemaVersion:TAXONOMY_SCHEMA_VERSION,
      categorySchemaVersion:TAXONOMY_SCHEMA_VERSION
    });
    await this.syncRoutineOverview(await this.loadRoutines());

    this.monthCache.clear();
    this.refreshViews();
    new Notice('할 일과 루틴을 새 분류 체계로 이관했습니다.');
  }

  async saveGroupSettings() {
    await this.saveCategorySettings();
  }

  async openCategoryChoiceModal(title, current=null) {
    const plugin = this;
    const { Modal } = require('obsidian');
    return await new Promise((resolve) => {
      const modal = enableModalMotion(new Modal(this.app));
      let settled = false;
      let selectedValue = null;

      const render = () => {
        const { contentEl } = modal;
        contentEl.empty();
        contentEl.addClass('momo-choice-modal');
        contentEl.addClass('momo-category-choice-modal');

        const head = contentEl.createDiv({ cls:'momo-category-choice-head' });
        head.createEl('h2', { text:title });
        const manage = head.createEl('button', { text:uiText('manage'), cls:'momo-category-manage-link' });
        manage.onclick = async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          await plugin.openCategoryManager();
          render();
        };

        const list = contentEl.createDiv({ cls:'momo-choice-list' });
        for (const value of CATEGORIES.filter(x => !plugin.inactiveCategories?.has(x))) {
          const b = list.createEl('button', { text:value, cls:'momo-choice-item' });
          if (value === current) b.addClass('is-current');
          b.onclick = () => {
            settled = true;
            selectedValue = value;
            modal.close();
          };
        }
      };

      modal.onOpen = render;
      modal.onClose = () => resolve(settled ? selectedValue : null);
      modal.open();
    });
  }

  async openCategoryManager(initialTab='categories') {
    return this.openTodoSettings(initialTab);
  }

  async openTodoSettings(initialTab='categories') {
    const { Modal } = require('obsidian');
    const plugin = this;

    return await new Promise((resolve) => {
      const modal = enableModalMotion(new Modal(this.app));
      let tab = initialTab === 'groups' ? 'groups' : 'categories';
      let groupCategory = CATEGORIES.find(x => !plugin.inactiveCategories?.has(x)) || '기타';
      let editing = null;

      const commitInlineEdit = async (type, category, from, input) => {
        const clean = normalizeCategoryName(input.value);
        if (!clean || clean === from) {
          editing = null;
          render();
          return;
        }

        if (type === 'category') {
          if (CATEGORIES.includes(clean)) {
            new Notice(uiText('duplicateCategory'));
            input.focus();
            return;
          }
          if (hasCategoryTagCollision(clean, from)) {
            new Notice(uiText('duplicateCategoryTag'));
            input.focus();
            return;
          }
          await plugin.renameCategory(from, clean);
          if (groupCategory === from) groupCategory = clean;
        } else {
          const groups = GROUP_PRESETS[category] || [];
          if (groups.includes(clean)) {
            new Notice(uiText('duplicateGroup'));
            input.focus();
            return;
          }
          await plugin.renameGroup(category, from, clean);
        }
        editing = null;
        render();
      };

      const createInlineName = (row, type, category, name) => {
        if (editing?.type === type && editing?.category === category && editing?.name === name) {
          const editWrap = row.createDiv({ cls:'momo-settings-inline-edit' });
          const input = stabilizeTextInput(editWrap.createEl('input'));
          input.type = 'text';
          input.value = name;
          const cancel = editWrap.createEl('button', { text:uiText('cancel') });
          const save = editWrap.createEl('button', { text:uiText('save'), cls:'mod-cta' });
          cancel.onclick = () => { editing = null; render(); };
          save.onclick = () => commitInlineEdit(type, category, name, input);
          input.addEventListener('keydown', ev => {
            if (ev.key === 'Enter' && !ev.isComposing) {
              ev.preventDefault();
              commitInlineEdit(type, category, name, input);
            } else if (ev.key === 'Escape') {
              ev.preventDefault();
              editing = null;
              render();
            }
          });
          setTimeout(() => { input.focus(); input.select(); }, 30);
          return true;
        }
        row.createSpan({ text:name, cls:'momo-settings-item-name' });
        return false;
      };

      const renderCategoryTab = (body) => {
        const top = body.createDiv({ cls:'momo-settings-section-head' });
        const text = top.createDiv();
        text.createEl('h3', { text:uiText('categoryTab') });

        const add = top.createEl('button', { text:uiText('addRoutine'), cls:'momo-settings-add' });
        add.onclick = () => {
          const row = list.createDiv({ cls:'momo-settings-row is-new' });
          const editWrap = row.createDiv({ cls:'momo-settings-inline-edit' });
          const input = stabilizeTextInput(editWrap.createEl('input'));
          input.type = 'text';
          input.placeholder = uiText('newCategory');
          const save = editWrap.createEl('button', { text:uiText('add'), cls:'mod-cta' });
          const cancel = editWrap.createEl('button', { text:uiText('cancel') });
          const finish = async () => {
            const clean = normalizeCategoryName(input.value);
            if (!clean) return input.focus();
            if (CATEGORIES.includes(clean)) {
              new Notice(uiText('duplicateCategory'));
              return input.focus();
            }
            if (hasCategoryTagCollision(clean)) {
              new Notice(uiText('duplicateCategoryTag'));
              return input.focus();
            }
            CATEGORIES.splice(Math.max(0, CATEGORIES.length - 1), 0, clean);
            ensureCategoryRuntime(clean);
            await plugin.saveCategorySettings();
            plugin.refreshViews();
            render();
          };
          save.onclick = finish;
          cancel.onclick = render;
          input.addEventListener('keydown', ev => {
            if (ev.key === 'Enter' && !ev.isComposing) { ev.preventDefault(); finish(); }
            if (ev.key === 'Escape') { ev.preventDefault(); render(); }
          });
          setTimeout(() => input.focus(), 30);
        };

        const list = body.createDiv({ cls:'momo-settings-list' });
        for (const category of CATEGORIES) {
          const inactive = plugin.inactiveCategories?.has(category);
          const row = list.createDiv({ cls:'momo-settings-row' });
          if (inactive) row.addClass('is-inactive');

          const left = row.createDiv({ cls:'momo-settings-row-main' });
          if (!createInlineName(left, 'category', category, category) && inactive) {
            left.createSpan({ text:uiText('inactive'), cls:'momo-settings-state' });
          }

          const actions = row.createDiv({ cls:'momo-settings-row-actions' });
          if (category === '기타') {
            actions.createSpan({ text:uiText('defaultLabel'), cls:'momo-category-protected' });
            continue;
          }

          if (inactive) {
            const restore = actions.createEl('button', { text:uiText('restore') });
            restore.onclick = async () => {
              plugin.inactiveCategories.delete(category);
              await plugin.saveCategorySettings();
              render();
            };
            continue;
          }

          const idx = CATEGORIES.indexOf(category);
          const up = actions.createEl('button', { text:'↑', attr:{'aria-label':uiText('moveUp',{name:category})} });
          up.disabled = idx <= 0;
          up.onclick = async () => {
            if (idx <= 0) return;
            [CATEGORIES[idx-1], CATEGORIES[idx]] = [CATEGORIES[idx], CATEGORIES[idx-1]];
            await plugin.saveCategorySettings();
            plugin.refreshViews();
            render();
          };

          const down = actions.createEl('button', { text:'↓', attr:{'aria-label':uiText('moveDown',{name:category})} });
          down.disabled = idx >= CATEGORIES.length - 2;
          down.onclick = async () => {
            if (idx >= CATEGORIES.length - 2) return;
            [CATEGORIES[idx], CATEGORIES[idx+1]] = [CATEGORIES[idx+1], CATEGORIES[idx]];
            await plugin.saveCategorySettings();
            plugin.refreshViews();
            render();
          };

          const edit = actions.createEl('button', { text:uiText('edit') });
          edit.onclick = () => {
            editing = { type:'category', category, name:category };
            render();
          };

          const del = actions.createEl('button', { text:uiText('cleanup'), cls:'momo-category-delete' });
          del.onclick = () => plugin.openCategoryRetireDialog(category, () => render());
        }
      };

      const renderGroupTab = (body) => {
        const top = body.createDiv({ cls:'momo-settings-section-head' });
        const text = top.createDiv();
        text.createEl('h3', { text:uiText('groupTab') });

        const add = top.createEl('button', { text:uiText('addRoutine'), cls:'momo-settings-add' });
        add.onclick = () => {
          const row = list.createDiv({ cls:'momo-settings-row is-new' });
          const editWrap = row.createDiv({ cls:'momo-settings-inline-edit' });
          const input = stabilizeTextInput(editWrap.createEl('input'));
          input.type = 'text';
          input.placeholder = `${groupCategory} · ${uiText('newGroup')}`;
          const save = editWrap.createEl('button', { text:uiText('add'), cls:'mod-cta' });
          const cancel = editWrap.createEl('button', { text:uiText('cancel') });
          const finish = async () => {
            const clean = normalizeCategoryName(input.value);
            if (!clean || clean === '그룹 없음') return input.focus();
            const groups = GROUP_PRESETS[groupCategory] || (GROUP_PRESETS[groupCategory] = []);
            if (groups.includes(clean)) {
              new Notice(uiText('duplicateGroup'));
              return input.focus();
            }
            const otherIndex = groups.indexOf('기타');
            groups.splice(otherIndex >= 0 ? otherIndex : groups.length, 0, clean);
            rememberGroupLocal(groupCategory, clean);
            await plugin.saveGroupSettings();
            render();
          };
          save.onclick = finish;
          cancel.onclick = render;
          input.addEventListener('keydown', ev => {
            if (ev.key === 'Enter' && !ev.isComposing) { ev.preventDefault(); finish(); }
            if (ev.key === 'Escape') { ev.preventDefault(); render(); }
          });
          setTimeout(() => input.focus(), 30);
        };

        const categoryPicker = body.createDiv({ cls:'momo-settings-category-picker' });
        categoryPicker.createSpan({ text:uiText('categoryTab'), cls:'momo-settings-picker-label' });
        const categoryButton = createPillField(categoryPicker, groupCategory);
        categoryButton.onclick = async () => {
          const picked = await plugin.openCategoryChoiceModal(uiText('chooseCategory'), groupCategory);
          if (!picked) return;
          groupCategory = picked;
          editing = null;
          render();
        };

        const list = body.createDiv({ cls:'momo-settings-list' });
        const groups = GROUP_PRESETS[groupCategory] || [];
        const inactiveSet = plugin.inactiveGroups?.[groupCategory] || new Set();

        if (!groups.length) {
          list.createDiv({ text:uiText('noGroups'), cls:'momo-settings-empty' });
        }

        for (const group of groups) {
          const inactive = inactiveSet.has(group);
          const row = list.createDiv({ cls:'momo-settings-row' });
          if (inactive) row.addClass('is-inactive');

          const left = row.createDiv({ cls:'momo-settings-row-main' });
          if (!createInlineName(left, 'group', groupCategory, group) && inactive) {
            left.createSpan({ text:uiText('inactive'), cls:'momo-settings-state' });
          }

          const actions = row.createDiv({ cls:'momo-settings-row-actions' });
          if (group === '기타') {
            actions.createSpan({ text:uiText('defaultLabel'), cls:'momo-category-protected' });
            continue;
          }
          if (inactive) {
            const restore = actions.createEl('button', { text:uiText('restore') });
            restore.onclick = async () => {
              if (!plugin.inactiveGroups[groupCategory]) plugin.inactiveGroups[groupCategory] = new Set();
              plugin.inactiveGroups[groupCategory].delete(group);
              await plugin.saveGroupSettings();
              render();
            };
            continue;
          }

          const idx = groups.indexOf(group);
          const up = actions.createEl('button', { text:'↑', attr:{'aria-label':uiText('moveUp',{name:group})} });
          up.disabled = idx <= 0;
          up.onclick = async () => {
            if (idx <= 0) return;
            [groups[idx-1], groups[idx]] = [groups[idx], groups[idx-1]];
            await plugin.saveGroupSettings();
            render();
          };

          const down = actions.createEl('button', { text:'↓', attr:{'aria-label':uiText('moveDown',{name:group})} });
          down.disabled = idx >= groups.length - 2;
          down.onclick = async () => {
            if (idx >= groups.length - 2) return;
            [groups[idx], groups[idx+1]] = [groups[idx+1], groups[idx]];
            await plugin.saveGroupSettings();
            render();
          };

          const edit = actions.createEl('button', { text:uiText('edit') });
          edit.onclick = () => {
            editing = { type:'group', category:groupCategory, name:group };
            render();
          };

          const del = actions.createEl('button', { text:uiText('cleanup'), cls:'momo-category-delete' });
          del.onclick = () => plugin.openGroupRetireDialog(groupCategory, group, () => render());
        }
      };

      const render = () => {
        const { contentEl } = modal;
        contentEl.empty();
        contentEl.addClass('momo-todo-settings');

        const head = contentEl.createDiv({ cls:'momo-settings-head' });
        const titleWrap = head.createDiv();
        titleWrap.createEl('h2', { text:uiText('classificationSettings') });

        const tabs = contentEl.createDiv({ cls:'momo-settings-tabs' });
        const catTab = tabs.createEl('button', { text:uiText('categoryTab'), cls:'momo-settings-tab' });
        if (tab === 'categories') catTab.addClass('is-active');
        catTab.onclick = () => { tab = 'categories'; editing = null; render(); };

        const groupTab = tabs.createEl('button', { text:uiText('groupTab'), cls:'momo-settings-tab' });
        if (tab === 'groups') groupTab.addClass('is-active');
        groupTab.onclick = () => { tab = 'groups'; editing = null; render(); };

        const body = contentEl.createDiv({ cls:'momo-settings-body' });
        if (tab === 'categories') renderCategoryTab(body);
        else renderGroupTab(body);
      };

      modal.onOpen = render;
      modal.onClose = () => resolve();
      modal.open();
    });
  }


  async openGroupChoiceModal(title, category, current=null) {
    const { Modal } = require('obsidian');
    const plugin = this;
    return await new Promise((resolve) => {
      const modal = enableModalMotion(new Modal(this.app));
      let settled = false;
      let selectedValue = null;

      const render = () => {
        const { contentEl } = modal;
        contentEl.empty();
        contentEl.addClass('momo-choice-modal');
        contentEl.addClass('momo-group-choice-modal');

        const head = contentEl.createDiv({ cls:'momo-category-choice-head' });
        head.createEl('h2', { text:title });
        const manage = head.createEl('button', { text:uiText('manage'), cls:'momo-category-manage-link' });
        manage.onclick = async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          await plugin.openGroupManager(category);
          render();
        };

        const list = contentEl.createDiv({ cls:'momo-choice-list' });
        const hiddenGroups = plugin.inactiveGroups?.[category] || new Set();
        const choices = [...new Set(
          (GROUP_PRESETS[category] || ['기타']).filter(x => x && !hiddenGroups.has(x))
        )];
        for (const value of choices) {
          const b = list.createEl('button', { text:value, cls:'momo-choice-item' });
          if (value === (current || '기타')) b.addClass('is-current');
          b.onclick = () => {
            settled = true;
            selectedValue = value;
            modal.close();
          };
        }
      };

      modal.onOpen = render;
      modal.onClose = () => resolve(settled ? selectedValue : null);
      modal.open();
    });
  }

  async openGroupManager(initialCategory=null) {
    return this.openTodoSettings('groups');
  }


  async openCategoryRetireDialog(category, onDone=null) {
    const { Modal } = require('obsidian');
    const plugin = this;
    const modal = enableModalMotion(new Modal(this.app));

    modal.onOpen = () => {
      const { contentEl } = modal;
      contentEl.empty();
      contentEl.addClass('momo-retire-modal');
      contentEl.createEl('h2', { text:uiText('cleanupTitle',{name:category}) });
      const options = contentEl.createDiv({ cls:'momo-retire-options' });

      const make = (title, desc, handler, danger=false) => {
        const b = options.createEl('button', { cls:'momo-retire-option' });
        if (danger) b.addClass('is-danger');
        b.createSpan({ text:title, cls:'momo-retire-option-title' });
        b.createSpan({ text:desc, cls:'momo-retire-option-desc' });
        b.onclick = async () => {
          await handler();
          modal.close();
          onDone?.();
        };
      };

      make(uiText('mergeCategory'),
        uiText('mergeCategoryDesc'),
        async () => {
          const choices = CATEGORIES.filter(x => x !== category && !plugin.inactiveCategories?.has(x));
          const target = await openChoiceModal(plugin.app, uiText('chooseMergeCategory'), choices, null);
          if (!target) return;
          await plugin.mergeCategory(category, target);
        });

      make(uiText('disableFuture'),
        uiText('disableFutureDesc'),
        async () => {
          plugin.inactiveCategories.add(category);
          await plugin.saveCategorySettings();
          plugin.refreshViews();
          new Notice(uiText('categoryDisabled',{name:category}));
        });

      make(uiText('deleteAll'),
        uiText('deleteAllDesc'),
        async () => {
          const ok = window.confirm(`"${category}" 카테고리의 과거·현재 할 일과 루틴을 전부 삭제할까요?\n이 작업은 되돌리기 어렵습니다.`);
          if (!ok) return;
          await plugin.hardDeleteCategory(category);
        },
        true);
    };

    modal.open();
  }

  async openGroupRetireDialog(category, group, onDone=null) {
    const { Modal } = require('obsidian');
    const plugin = this;
    const modal = enableModalMotion(new Modal(this.app));

    modal.onOpen = () => {
      const { contentEl } = modal;
      contentEl.empty();
      contentEl.addClass('momo-retire-modal');
      contentEl.createEl('h2', { text:uiText('cleanupTitle',{name:group}) });
      const options = contentEl.createDiv({ cls:'momo-retire-options' });

      const make = (title, desc, handler, danger=false) => {
        const b = options.createEl('button', { cls:'momo-retire-option' });
        if (danger) b.addClass('is-danger');
        b.createSpan({ text:title, cls:'momo-retire-option-title' });
        b.createSpan({ text:desc, cls:'momo-retire-option-desc' });
        b.onclick = async () => {
          await handler();
          modal.close();
          onDone?.();
        };
      };

      make(uiText('mergeGroup'),
        uiText('mergeGroupDesc'),
        async () => {
          const hidden = plugin.inactiveGroups?.[category] || new Set();
          const choices = (GROUP_PRESETS[category] || []).filter(x => x !== group && !hidden.has(x));
          if (!choices.length) {
            new Notice(uiText('noMergeGroup'));
            return;
          }
          const target = await openChoiceModal(plugin.app, uiText('chooseMergeGroup'), choices, null);
          if (!target) return;
          await plugin.mergeGroup(category, group, target);
        });

      make(uiText('disableFuture'),
        uiText('disableFutureDesc'),
        async () => {
          if (!plugin.inactiveGroups[category]) plugin.inactiveGroups[category] = new Set();
          plugin.inactiveGroups[category].add(group);
          await plugin.saveGroupSettings();
          plugin.refreshViews();
          new Notice(uiText('groupDisabled',{name:group}));
        });

      make(uiText('mergeOther'),
        uiText('mergeOtherDesc'),
        async () => plugin.mergeGroup(category, group, '기타'),
        true);
    };

    modal.open();
  }

  async hardDeleteCategory(category) {
    if (!category || category === '기타') return;
    await this.createRollingAutoSafetyBackup('category-delete');

    const tag = categoryTag(category);
    const files = this.app.vault.getFiles().filter(file =>
      file.path.endsWith('.md') &&
      (file.path.startsWith(`${DATA_FOLDER}/`) || file.path === TASK_HUB_PATH)
    );

    for (const file of files) {
      await mutateTextFile(this.app, file, text => {
        const lines = text.split('\n');
        const nextLines = lines.filter(line => {
          if (!/^- \[[ xX]\] /.test(line)) return true;
          return !new RegExp(`(^|\\s)${escapeRegex(tag)}(?=\\s|$)`).test(line);
        });
        return nextLines.length !== lines.length ? nextLines.join('\n') : text;
      });
    }

    const routines = await this.loadRoutines();
    const nextRoutines = routines.filter(r => (r.category || '기타') !== category);
    if (nextRoutines.length !== routines.length) {
      await this.saveRoutines(nextRoutines);
    }

    const index = CATEGORIES.indexOf(category);
    if (index >= 0) CATEGORIES.splice(index, 1);

    this.inactiveCategories?.delete(category);
    delete this.inactiveGroups[category];

    const oldTag = categoryTag(category);
    delete TAG_TO_CATEGORY[oldTag];
    delete CATEGORY_TAGS[category];
    delete GROUP_PRESETS[category];
    delete COLORS[category];
    clearCategoryLocalStorage(category);
    this.removeCategoryIdentity(category);

    await this.saveCategorySettings();
    await this.syncRoutineOverview(await this.loadRoutines());
    this.monthCache.clear();
    this.refreshViews();
    new Notice(uiText('categoryDeleted',{name:category}));
  }

  async mergeCategory(from, to) {
    if (!from || !to || from === to || from === '기타') return;
    await this.createRollingAutoSafetyBackup('category-merge');
    await this.migrateCategoryReferences(from, to, { preserveGroups:false });

    const idx = CATEGORIES.indexOf(from);
    if (idx >= 0) CATEGORIES.splice(idx, 1);

    this.inactiveCategories?.delete(from);
    delete this.inactiveGroups[from];

    const oldTag = categoryTag(from);
    delete TAG_TO_CATEGORY[oldTag];
    delete CATEGORY_TAGS[from];
    delete GROUP_PRESETS[from];
    delete COLORS[from];
    clearCategoryLocalStorage(from);
    this.removeCategoryIdentity(from);

    await this.saveCategorySettings();
    await this.syncRoutineOverview(await this.loadRoutines());
    this.monthCache.clear();
    this.refreshViews();
    new Notice(uiText('categoryMerged',{from,to}));
  }

  async mergeGroup(category, from, to=null) {
    if (!category || !from || from === '기타' || from === to) return;
    await this.createRollingAutoSafetyBackup('group-merge');
    await this.migrateGroupReferences(category, from, to);

    const groups = GROUP_PRESETS[category] || [];
    const idx = groups.indexOf(from);
    if (idx >= 0) groups.splice(idx, 1);

    if (this.inactiveGroups?.[category]) this.inactiveGroups[category].delete(from);
    removeGroupLocalStorage(category, from);
    this.removeGroupIdentity(category, from);

    await this.saveGroupSettings();
    await this.syncRoutineOverview(await this.loadRoutines());
    this.monthCache.clear();
    this.refreshViews();
    new Notice(to
      ? `${from} 그룹을 ${to}(으)로 통합했습니다.`
      : `${from} 그룹을 그룹 없음으로 이전했습니다.`);
  }

  async migrateGroupReferences(category, from, to=null) {
    const files = this.app.vault.getFiles().filter(file =>
      file.path.endsWith('.md') && (file.path.startsWith(`${DATA_FOLDER}/`) || file.path === TASK_HUB_PATH)
    );
    const categoryTagValue = categoryTag(category);
    const categoryRe = new RegExp(`(^|\\s)${escapeRegex(categoryTagValue)}(?=\\s|$)`);
    const oldMeta = new RegExp(`\\s*\\[sourceGroup::\\s*${escapeRegex(from)}\\s*\\]`, 'g');
    for (const file of files) {
      await mutateTextFile(this.app, file, text => {
        const lines = text.split('\n');
        let changed = false;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (!/^- \[([ xX])\] /.test(line) || !categoryRe.test(line) || !oldMeta.test(line)) {
            oldMeta.lastIndex = 0;
            continue;
          }
          oldMeta.lastIndex = 0;
          const next = (to && to !== '기타') ? line.replace(oldMeta, ` [sourceGroup:: ${to}]`) : line.replace(oldMeta, '');
          oldMeta.lastIndex = 0;
          if (next !== line) { lines[i] = next; changed = true; }
        }
        return changed ? lines.join('\n') : text;
      });
    }

    const routines = await this.loadRoutines();
    let changed = false;
    const nextRoutines = routines.map(r => {
      if ((r.category || '기타') !== category || r.group !== from) return r;
      changed = true;
      return { ...r, group:to };
    });
    if (changed) await this.saveRoutines(nextRoutines);
  }

  async renameGroup(category, from, to) {
    const groups = GROUP_PRESETS[category] || [];
    const index = groups.indexOf(from);
    if (index < 0 || !to || from === to || groups.includes(to)) return;
    await this.migrateGroupReferences(category, from, to);
    groups[index] = to;
    this.renameGroupIdentity(category, from, to);
    migrateGroupLocalStorage(category, from, to);
    await this.saveGroupSettings();
    await this.syncRoutineOverview(await this.loadRoutines());
    this.monthCache.clear();
    this.refreshViews();
    new Notice(uiText('renamedTo',{from,to}));
  }

  async deleteGroup(category, group) {
    return this.mergeGroup(category, group, '기타');
  }

  async countCategoryUsage(category) {
    let count = 0;
    const oldTag = categoryTag(category);
    for (const file of this.app.vault.getFiles()) {
      if (!file.path.endsWith('.md')) continue;
      if (!(file.path.startsWith(`${DATA_FOLDER}/`) || file.path === TASK_HUB_PATH)) continue;
      const text = await this.app.vault.cachedRead(file);
      count += (text.match(new RegExp(`(^|\\s)${escapeRegex(oldTag)}(?=\\s|$)`, 'gm')) || []).length;
    }
    const routines = await this.loadRoutines();
    count += routines.filter(r => (r.category || '기타') === category).length;
    return count;
  }

  async migrateCategoryReferences(from, to, { preserveGroups=true }={}) {
    const oldTag = categoryTag(from);
    const newTag = categoryTag(to);
    const targetGroups = new Set(GROUP_PRESETS[to] || ['기타']);
    const files = this.app.vault.getFiles().filter(file =>
      file.path.endsWith('.md') && (file.path.startsWith(`${DATA_FOLDER}/`) || file.path === TASK_HUB_PATH)
    );
    for (const file of files) {
      await mutateTextFile(this.app, file, text => {
        const lines = text.split('\n');
        let changed = false;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (!new RegExp(`(^|\\s)${escapeRegex(oldTag)}(?=\\s|$)`).test(line)) continue;
          let next = line.replace(new RegExp(`(^|\\s)${escapeRegex(oldTag)}(?=\\s|$)`, 'g'), (_, lead) => `${lead}${newTag}`);
          if (!preserveGroups) {
            const sourceGroup = (next.match(/\[sourceGroup::\s*([^\]]+)\]/) || [])[1]?.trim() || null;
            if (sourceGroup && !targetGroups.has(sourceGroup)) next = next.replace(/\s*\[sourceGroup::\s*[^\]]+\]/g, '');
          }
          if (next !== line) { lines[i] = next; changed = true; }
        }
        return changed ? lines.join('\n') : text;
      });
    }

    const routines = await this.loadRoutines();
    let changed = false;
    const nextRoutines = routines.map(r => {
      if ((r.category || '기타') !== from) return r;
      changed = true;
      const group = preserveGroups ? r.group : (targetGroups.has(r.group) ? r.group : null);
      return { ...r, category:to, section:to, group };
    });
    if (changed) await this.saveRoutines(nextRoutines);
  }

  async renameCategory(from, to) {
    const oldIndex = CATEGORIES.indexOf(from);
    if (oldIndex < 0 || !to || from === to || CATEGORIES.includes(to) || hasCategoryTagCollision(to, from)) return;

    // Category display names are mutable, but the backing task tag is a stable identity.
    // Keeping the old tag makes rename atomic: historical task files do not need a
    // destructive mass rewrite, and synced stale files cannot recreate the old category.
    const oldGroups = GROUP_PRESETS[from] ? [...GROUP_PRESETS[from]] : ['기타'];
    const oldInactiveGroups = new Set(this.inactiveGroups?.[from] || []);
    const categoryWasInactive = Boolean(this.inactiveCategories?.has(from));
    const stableTag = categoryTag(from);

    GROUP_PRESETS[to] = [...oldGroups];
    CATEGORY_TAGS[to] = stableTag;
    COLORS[to] = COLORS[from] || '#8a8f98';

    if (!this.inactiveGroups) this.inactiveGroups = {};
    this.inactiveGroups[to] = oldInactiveGroups;
    delete this.inactiveGroups[from];
    if (categoryWasInactive) {
      this.inactiveCategories?.delete(from);
      this.inactiveCategories?.add(to);
    }

    // Routine definitions store the display category name directly, so only they need
    // a semantic rename. Task lines keep the stable backing tag unchanged.
    const routines = await this.loadRoutines();
    let routineChanged = false;
    const nextRoutines = routines.map(r => {
      if ((r.category || '기타') !== from) return r;
      routineChanged = true;
      return { ...r, category:to, section:to };
    });
    if (routineChanged) await this.saveRoutines(nextRoutines);

    CATEGORIES[oldIndex] = to;
    this.renameCategoryIdentity(from, to);
    delete TAG_TO_CATEGORY[stableTag];
    TAG_TO_CATEGORY[stableTag] = to;
    delete CATEGORY_TAGS[from];
    delete GROUP_PRESETS[from];
    delete COLORS[from];
    migrateCategoryLocalStorage(from, to);

    await this.saveCategorySettings();
    await this.syncRoutineOverview(await this.loadRoutines());
    this.monthCache.clear();
    this.refreshViews();
    new Notice(uiText('renamedTo',{from,to}));
  }

  async deleteCategory(category) {
    if (category === '기타') return;
    return this.mergeCategory(category, '기타');
  }

  async ensureFolder(path) {
    await ensureVaultFolderPath(this.app, path);
  }

  async openMonthlyRecord(date) {
    await this.ensureFolder(MONTHLY_RECORD_FOLDER);
    const month = date.slice(0,7);
    const path = `${MONTHLY_RECORD_FOLDER}/${month}.md`;
    const [y,m] = month.split('-').map(Number);
    const initial = `---\ntype: monthly-journal\nmonth: ${month}\n---\n\n# ${y}년 ${m}월 기록\n\n## ${date}\n\n### 일기\n\n### 메모\n`;
    const outcome = await mutateTextFile(this.app, path, text => {
      if (new RegExp(`^## ${escapeRegex(date)}$`, 'm').test(text)) return text;
      return `${text.trimEnd()}\n\n## ${date}\n\n### 일기\n\n### 메모\n`;
    }, { createContent:initial });
    if (outcome.file) await this.app.workspace.getLeaf(true).openFile(outcome.file);
  }


  async openMonthlyReview(month = this.selectedDate.slice(0,7), reveal = true) {
    await this.ensureFolder(MONTHLY_REVIEW_FOLDER);
    const path = `${MONTHLY_REVIEW_FOLDER}/${month}.md`;
    const monthMap = await this.getMonthData(month);
    const tasks = [...monthMap.values()].flat().filter(x => x.isTask);
    const done = tasks.filter(x => x.done);
    const rate = tasks.length ? Math.round(done.length / tasks.length * 1000) / 10 : 0;
    const doneByCategory = new Map();
    const doneByGroup = new Map();
    for (const item of done) {
      doneByCategory.set(item.category, (doneByCategory.get(item.category) || 0) + 1);
      const groupKey = `${item.category}::${item.group || '기타'}`;
      doneByGroup.set(groupKey, (doneByGroup.get(groupKey) || 0) + 1);
    }
    const best = getTopCountEntry(doneByCategory);
    const bestGroup = getTopCountEntry(doneByGroup);
    const previousMonth = shiftMonth(`${month}-01`, -1).slice(0,7);
    const previousMonthMap = await this.getMonthData(previousMonth);
    const previousDone = [...previousMonthMap.values()].flat().filter(x => x.isTask && x.done);
    const previousDoneByCategory = new Map();
    for (const item of previousDone) previousDoneByCategory.set(item.category, (previousDoneByCategory.get(item.category) || 0) + 1);
    const shift = summarizeCategoryShift(doneByCategory, previousDoneByCategory);
    const bestGroupParts = bestGroup ? String(bestGroup[0]).split('::') : [];
    const bestGroupCategory = bestGroupParts[0] || null;
    const bestGroupName = bestGroupParts[1] || null;
    const reviewCategories = [...new Set([...CATEGORIES, ...doneByCategory.keys()])];
    const catLines = reviewCategories
      .filter(c => doneByCategory.get(c))
      .map(c => `- ${c} **${doneByCategory.get(c)}**`)
      .join('\n') || '- -';
    const stats = `%% momo:review-stats:start %%
## ${uiText('monthSummary')}
- ${uiText('completionRate')} **${rate}%** (${done.length}/${tasks.length})
- ${uiText('focusCategory')} **${best ? `${best[0]} · ${best[1]}` : '-'}**
- ${uiText('focusGroup')} **${bestGroupName ? `${bestGroupName} · ${bestGroup[1]}` : '-'}**${bestGroupCategory ? ` (${bestGroupCategory})` : ''}
- ${uiText('lastMonthChange')} **${shift.value}**

## ${uiText('categoryRecord')}
${catLines}
%% momo:review-stats:end %%`;

    const initial = buildMonthlyReviewDocument(month, stats);
    const outcome = await mutateTextFile(this.app, path, text => buildMonthlyReviewDocument(month, stats, text), { createContent:initial });
    const file = outcome.file;
    if (reveal && file) await this.app.workspace.getLeaf(true).openFile(file);
    return file;
  }

  async showMonthlyReviewModal(file, month) {
    const { Modal, MarkdownRenderer, Component } = require('obsidian');
    const modal = enableModalMotion(new Modal(this.app));
    const component = new Component();
    component.load();

    modal.onOpen = async () => {
      const { contentEl } = modal;
      contentEl.empty();
      contentEl.addClass('momo-monthly-review-modal');

      const head = contentEl.createDiv({ cls:'momo-review-head' });
      const titleWrap = head.createDiv();
      const [y,m] = month.split('-').map(Number);
      titleWrap.createEl('h2', { text:`${y}년 ${m}월 회고` });
      titleWrap.createDiv({ text:'월간 기록을 한눈에 확인합니다.', cls:'momo-review-sub' });

      const openDoc = head.createEl('button', { text:'문서 열기', cls:'momo-review-open' });
      openDoc.onclick = () => {
        modal.close();
        setTimeout(() => this.app.workspace.getLeaf(true).openFile(file), 140);
      };

      let text = await this.app.vault.read(file);
      text = text.replace(/^---\n[\s\S]*?\n---\n?/, '');
      text = text.replace(/%% momo:review-stats:start %%|%% momo:review-stats:end %%/g, '');
      const body = contentEl.createDiv({ cls:'momo-review-body markdown-rendered' });
      try {
        await MarkdownRenderer.render(this.app, text, body, file.path, component);

        const headings = Array.from(body.querySelectorAll(':scope > h2'));
        headings.forEach((heading, index) => {
          const section = document.createElement('section');
          section.className = `momo-review-section ${index < 2 ? 'is-stats' : 'is-reflection'}`;
          heading.parentNode.insertBefore(section, heading);
          section.appendChild(heading);

          let node = section.nextSibling;
          while (node && !(node.nodeType === 1 && node.tagName === 'H2')) {
            const next = node.nextSibling;
            section.appendChild(node);
            node = next;
          }
        });

        body.querySelectorAll('.momo-review-section li').forEach(li => {
          if (!li.textContent.trim()) li.classList.add('is-empty');
        });
      } catch (error) {
        console.error('월간 회고 렌더링:', error);
        body.createEl('pre', { text });
      }
    };

    modal.onClose = () => {
      try { component.unload(); } catch (_) {}
    };
    modal.open();
  }

  async runMonthlyMaintenance() {
    const today = todaySeoul();
    const currentMonth = today.slice(0,7);
    const key = `momo.todo.monthlyCleanup.${currentMonth}`;
    const previousMonth = shiftMonth(`${currentMonth}-01`, -1).slice(0,7);
    const hasPendingDaily = this.app.vault.getFiles().some(file =>
      file.path.startsWith(`${DAILY_FOLDER}/${previousMonth}-`) && /^\d{4}-\d{2}-\d{2}\.md$/.test(file.name)
    );
    try {
      if (momoLocalGet(key) === '1' && !hasPendingDaily) return;
    } catch (_) {}
    try {
      const result = await this.mergeDailyMonth(previousMonth);
      await this.openMonthlyReview(previousMonth, false);
      try { momoLocalSet(key, '1'); } catch (_) {}
      if (result.deleted > 0) {
        new Notice(`지난달 기록을 월간 파일로 정리하고 Daily 원본 ${result.deleted}개를 삭제했습니다.`);
      } else if (result.merged > 0) {
        new Notice(`지난달 기록 ${result.merged}일을 월간 기록으로 정리했습니다.`);
      }
    } catch (error) {
      console.error('투두리스트 월간 자동 정리:', error);
      new Notice('월간 기록 검증에 실패하여 Daily 원본은 삭제하지 않았습니다.');
    }
  }

  async mergeDailyMonth(month) {
    const dailyFiles = this.app.vault.getFiles()
      .filter(file => file.path.startsWith(`${DAILY_FOLDER}/${month}-`) && /^\d{4}-\d{2}-\d{2}\.md$/.test(file.name))
      .sort((a,b) => a.name.localeCompare(b.name));
    if (!dailyFiles.length) return { merged:0, deleted:0 };

    await this.ensureFolder(MONTHLY_RECORD_FOLDER);
    const path = `${MONTHLY_RECORD_FOLDER}/${month}.md`;
    const [y,m] = month.split('-').map(Number);
    const entries = [];
    for (const file of dailyFiles) {
      entries.push({ date:file.basename, body:dailyToMonthlyBody(await this.app.vault.read(file)) });
    }
    let merged = 0;
    const initial = `---\ntype: monthly-journal\nmonth: ${month}\n---\n\n# ${y}년 ${m}월 기록\n`;
    const outcome = await mutateTextFile(this.app, path, current => {
      let text = current;
      let added = 0;
      for (const entry of entries) {
        if (new RegExp(`^## ${escapeRegex(entry.date)}$`, 'm').test(text)) continue;
        text = `${text.trimEnd()}\n\n## ${entry.date}\n\n${entry.body}\n`;
        added += 1;
      }
      merged = added;
      return text;
    }, { createContent:initial });
    const target = outcome.file;
    if (!target) throw new Error('월간 기록 파일을 만들지 못했습니다.');

    const verifiedText = await this.app.vault.read(target);
    const missingDates = dailyFiles
      .map(file => file.basename)
      .filter(date => !new RegExp(`^## ${escapeRegex(date)}$`, 'm').test(verifiedText));
    if (missingDates.length) throw new Error(`월간 기록 검증 실패: ${missingDates.join(', ')}`);

    let deleted = 0;
    for (const file of dailyFiles) {
      await this.app.vault.delete(file);
      deleted += 1;
    }
    return { merged, deleted };
  }


  setHideCompleted(value) {
    this.hideCompleted = !!value;
    try { momoLocalSet('momo.todo.hideCompleted', this.hideCompleted ? '1' : '0'); } catch (_) {}
    this.refreshViews();
  }

  setShowAllCategories(value) {
    this.showAllCategories = !!value;
    try { momoLocalSet('momo.todo.showAllCategories', this.showAllCategories ? '1' : '0'); } catch (_) {}
    this.refreshViews();
  }


  async loadRoutines() {
    const file = this.app.vault.getAbstractFileByPath(ROUTINE_PATH);
    if (!file) return [];
    const text = await this.app.vault.read(file);
    const routines = [];
    const re = /%%\s*momo-routine:\s*(\{[^\n]*\})\s*%%/g;
    let match;
    while ((match = re.exec(text))) {
      try {
        const routine = JSON.parse(match[1]);
        if (routine && routine.id && routine.title) routines.push(routine);
      } catch (error) {
        console.warn('Momoan Todo · 루틴 파싱 실패:', match[1], error);
      }
    }
    return routines;
  }

  routineFrequencyLabel(routine) {
    const dayNames = {
      ko:['월','화','수','목','금','토','일'],
      en:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
      ja:['月','火','水','木','金','土','日'],
      zh:['一','二','三','四','五','六','日']
    }[ACTIVE_LANGUAGE] || ['월','화','수','목','금','토','일'];
    switch (routine.freq) {
      case 'daily': return uiText('daily');
      case 'weekdays': return ACTIVE_LANGUAGE === 'ko' ? '월~금' : uiText('weekdays');
      case 'weekends': return ACTIVE_LANGUAGE === 'ko' ? '토~일' : uiText('weekends');
      case 'weekly': {
        const days = (routine.days || []).map(d => dayNames[Number(d) - 1]).filter(Boolean);
        return days.length ? days.join('·') : uiText('weekly');
      }
      case 'monthly': {
        const day = routine.dayOfMonth || 1;
        if (ACTIVE_LANGUAGE === 'en') return `${uiText('monthly')} · day ${day}`;
        if (ACTIVE_LANGUAGE === 'ja') return `毎月${day}日`;
        if (ACTIVE_LANGUAGE === 'zh') return `每月${day}日`;
        return `매월 ${day}일`;
      }
      case 'monthly-last': return uiText('monthlyLast');
      case 'yearly': {
        const m = routine.monthOfYear || 1, d = routine.dayOfMonth || 1;
        if (ACTIVE_LANGUAGE === 'en') return `${uiText('yearly')} · ${m}/${d}`;
        if (ACTIVE_LANGUAGE === 'ja') return `毎年${m}月${d}日`;
        if (ACTIVE_LANGUAGE === 'zh') return `每年${m}月${d}日`;
        return `매년 ${m}월 ${d}일`;
      }
      default: return routine.freq || uiText('repeat');
    }
  }

  routineLine(routine) {
    const state = routine.active === false ? '⚪' : '🟢';
    const category = routine.category || '기타';
    const group = routine.group || '기타';
    const time = routine.time ? `[${routine.time}] ` : '';
    const display = `- ${state} **${category}** · ${group} · ${time}${routine.title} · ${this.routineFrequencyLabel(routine)}`;
    return `${display}\n  %% momo-routine: ${JSON.stringify(routine)} %%`;
  }

  async saveRoutines(routines) {
    await this.ensureFolder(ACTIVE_STORAGE_PATHS.root);
    const block = `<!-- momo:routines:start -->\n${routines.map(r => this.routineLine(r)).join('\n')}\n<!-- momo:routines:end -->`;
    const emptyBlock = `<!-- momo:routines:start -->\n\n<!-- momo:routines:end -->`;
    const today = todaySeoul();
    // Create a valid empty routine file first so adding the first routine is still
    // a text mutation that can be undone without deleting the canonical file.
    const initial = `---\ntype: routine\nstatus: active\nupdated: ${today}\n---\n\n# 루틴 관리\n\n> 루틴을 중지하거나 삭제해도 **이미 생성했거나 완료한 할 일 기록은 그대로 남습니다**. 변경은 앞으로 생성될 루틴에만 적용됩니다.\n\n${emptyBlock}\n\n## 원칙\n- 이 파일은 루틴 정의의 원본이다.\n- 기존 생성 기록은 보존하고, 변경 사항은 이후 생성분부터 적용한다.\n`;
    await mutateTextFile(this.app, ROUTINE_PATH, text => {
      let next = text.replace(/^updated:\s*.*$/m, `updated: ${today}`);
      const re = /<!-- momo:routines:start -->[\s\S]*?<!-- momo:routines:end -->/;
      next = re.test(next) ? next.replace(re, block) : `${next.trimEnd()}\n\n${block}\n`;
      return next;
    }, { createContent:initial });
    await this.syncRoutineOverview(routines);
  }


  async syncRoutineOverview(routines) {
    await this.ensureFolder(ACTIVE_STORAGE_PATHS.root);
    const today = todaySeoul();
    const active = routines.filter(r => r.active !== false);
    const sections = [];
    for (const category of CATEGORIES) {
      const list = active.filter(r => (r.category || '기타') === category);
      if (!list.length) continue;
      const lines = list.map(r => {
        const bits = [];
        if (r.group && r.group !== '기타' && r.group !== '루틴') bits.push(r.group);
        if (r.time) bits.push(`**${r.time}**`);
        bits.push(r.title);
        bits.push(this.routineFrequencyLabel(r));
        return `- ${bits.join(' · ')}`;
      });
      sections.push(`## ${category}\n\n${lines.join('\n')}`);
    }
    const content = `---\ntype: routine-overview\nupdated: ${today}\n---\n\n# 루틴 한눈에\n\n${sections.join('\n\n')}\n`;
    const initial = `---\ntype: routine-overview\nupdated: ${today}\n---\n\n# 루틴 한눈에\n`;
    await mutateTextFile(this.app, ROUTINE_OVERVIEW_PATH, () => content, { createContent:initial });
  }

  async openRoutineManager() {
    const { Modal } = require('obsidian');
    const routines = await this.loadRoutines();
    const plugin = this;

    const modal = enableModalMotion(new Modal(this.app));
    modal.onOpen = () => {
      const { contentEl } = modal;
      contentEl.empty();
      contentEl.addClass('momo-routine-manager');

      const head = contentEl.createDiv({ cls:'momo-routine-manager-head' });
      const titleWrap = head.createDiv();
      titleWrap.createEl('h2', { text:uiText('routineManager') });
      const add = head.createEl('button', { text:uiText('addRoutine'), cls:'momo-routine-manager-add' });
      add.onclick = async () => {
        modal.close();
        await plugin.openRoutineEditor(null);
      };

      if (!routines.length) {
        const empty = contentEl.createDiv({ cls:'momo-routine-manager-empty' });
        empty.createDiv({ text:uiText('noRoutines') });
        const b = empty.createEl('button', { text:uiText('firstRoutine') });
        b.onclick = async () => { modal.close(); await plugin.openRoutineEditor(null); };
        return;
      }

      const listWrap = contentEl.createDiv({ cls:'momo-routine-manager-list' });
      for (const category of CATEGORIES) {
        const list = routines.filter(r => (r.category || '기타') === category);
        if (!list.length) continue;

        const section = listWrap.createDiv({ cls:'momo-routine-manager-section' });
        section.createEl('h3', { text:category });

        for (const routine of list) {
          const row = section.createDiv({ cls:'momo-routine-row' });
          if (routine.active === false) row.addClass('is-paused');

          const info = row.createDiv({ cls:'momo-routine-info' });
          const first = info.createDiv({ cls:'momo-routine-title-line' });
          first.createSpan({ text:routine.active === false ? '○' : '●', cls:'momo-routine-state' });
          first.createSpan({ text:routine.title, cls:'momo-routine-title' });

          const meta = [];
          if (routine.group) meta.push(routine.group);
          if (routine.time) meta.push(plugin.formatTimeForDisplay(routine.time));
          meta.push(plugin.routineFrequencyLabel(routine));
          info.createDiv({ text:meta.join(' · '), cls:'momo-routine-meta' });

          const actions = row.createDiv({ cls:'momo-routine-actions' });

          const openEditor = async () => {
            modal.close();
            setTimeout(() => plugin.openRoutineEditor(routine), 0);
          };

          info.addClass('is-clickable');
          info.setAttr('title', uiText('editRoutine'));
          info.onclick = (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            openEditor();
          };

          const edit = actions.createEl('button', { text:uiText('edit') });
          edit.onclick = async (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            await openEditor();
          };


          const del = actions.createEl('button', { text:uiText('delete'), cls:'momo-routine-delete' });
          del.onclick = async (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            modal.close();
            setTimeout(() => plugin.openRoutineDeleteDialog(routine, routines), 0);
          };
        }
      }
    };
    modal.open();
  }

  async openRoutineEditor(existing) {
    const { Modal } = require('obsidian');
    const plugin = this;
    const routines = await this.loadRoutines();
    const base = existing ? { ...existing } : {
      id:`routine-${Date.now().toString(36)}`,
      title:'',
      category:'생활',
      group:'루틴',
      section:'생활',
      time:null,
      freq:'daily',
      days:[],
      dayOfMonth:null,
      monthOfYear:null,
      active:true
    };

    const modal = enableModalMotion(new Modal(this.app));
    modal.onOpen = () => {
      const { contentEl } = modal;
      contentEl.empty();
      contentEl.addClass('momo-routine-editor');
      contentEl.createEl('h2', { text:existing ? uiText('editRoutine') : uiText('newRoutine') });

      const form = contentEl.createDiv({ cls:'momo-routine-editor-form' });

      const makeRow = (label) => {
        const row = form.createDiv({ cls:'momo-routine-editor-row' });
        row.createDiv({ text:label, cls:'momo-routine-editor-label' });
        return row.createDiv({ cls:'momo-routine-editor-control' });
      };

      const title = stabilizeTextInput(makeRow(uiText('name')).createEl('input'));
      title.type = 'text';
      title.value = base.title || '';
      title.placeholder = uiText('routinePlaceholder');

      let selectedCategory = base.category || '기타';
      let selectedGroup = base.group || '기타';

      const category = createPillField(makeRow(uiText('category')), selectedCategory);
      const group = createPillField(makeRow(uiText('group')), selectedGroup);

      category.onclick = async () => {
        const picked = await plugin.openCategoryChoiceModal(uiText('chooseCategory'), selectedCategory);
        if (picked === null) return;
        selectedCategory = picked;
        category.setText(picked);
        const presets = GROUP_PRESETS[picked] || ['기타'];
        if (!presets.includes(selectedGroup)) {
          selectedGroup = '기타';
          group.setText('기타');
        }
      };
      group.onclick = async () => {
        const picked = await plugin.openGroupChoiceModal(uiText('chooseGroup'), selectedCategory, selectedGroup);
        if (picked === null) return;
        selectedGroup = picked;
        group.setText(selectedGroup);
      };

      const time = createTimeSelect(plugin.app, makeRow(uiText('time')), base.time || '');

      const freq = makeRow(uiText('repeat')).createEl('select');
      const freqOptions = [
        ['daily',uiText('daily')],
        ['weekdays',uiText('weekdays')],
        ['weekends',uiText('weekends')],
        ['weekly',uiText('weekly')],
        ['monthly',uiText('monthly')],
        ['monthly-last',uiText('monthlyLast')],
        ['yearly',uiText('yearly')]
      ];
      for (const [value,label] of freqOptions) {
        const opt = freq.createEl('option', { text:label });
        opt.value = value;
        if (value === base.freq) opt.selected = true;
      }

      const weeklyControl = makeRow(uiText('weekday'));
      const dayNames = {ko:['월','화','수','목','금','토','일'],en:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],ja:['月','火','水','木','金','土','日'],zh:['一','二','三','四','五','六','日']}[ACTIVE_LANGUAGE] || ['월','화','수','목','금','토','일'];
      const dayChecks = [];
      weeklyControl.addClass('momo-routine-day-wrap');
      for (let i=0; i<7; i++) {
        const label = weeklyControl.createEl('label');
        const cb = label.createEl('input');
        cb.type = 'checkbox';
        cb.checked = Array.isArray(base.days) && base.days.map(Number).includes(i+1);
        label.appendText(dayNames[i]);
        dayChecks.push(cb);
      }

      const monthControl = makeRow(uiText('month'));
      let monthValue = Number(base.monthOfYear || (new Date().getMonth()+1));
      const month = createPillField(monthControl, localizedMonthChoice(monthValue));

      const dayControl = makeRow(uiText('day'));
      let dayValue = Number(base.dayOfMonth || 1);
      const day = createPillField(dayControl, localizedDayChoice(dayValue));

      const maxDayForMonth = (m) => new Date(2024, Number(m), 0).getDate();
      const refreshDayLabel = () => {
        const maxDay = freq.value === 'yearly' ? maxDayForMonth(monthValue) : 31;
        if (dayValue > maxDay) dayValue = maxDay;
        day.setText(localizedDayChoice(dayValue));
      };
      month.onclick = async () => {
        const choices = Array.from({length:12}, (_,i)=>({label:localizedMonthChoice(i+1),value:i+1}));
        const labels = choices.map(x=>x.label);
        const picked = await openChoiceModal(plugin.app, uiText('chooseMonthPrompt'), labels, localizedMonthChoice(monthValue));
        if (picked === null) return;
        monthValue = (choices.find(x=>x.label===picked)?.value) || 1;
        month.setText(localizedMonthChoice(monthValue));
        refreshDayLabel();
      };
      day.onclick = async () => {
        const maxDay = freq.value === 'yearly' ? maxDayForMonth(monthValue) : 31;
        const choices = Array.from({length:maxDay}, (_,i)=>({label:localizedDayChoice(i+1),value:i+1}));
        const current = Math.min(dayValue, maxDay);
        const labels = choices.map(x=>x.label);
        const picked = await openChoiceModal(plugin.app, uiText('chooseDayPrompt'), labels, localizedDayChoice(current));
        if (picked === null) return;
        dayValue = (choices.find(x=>x.label===picked)?.value) || 1;
        day.setText(localizedDayChoice(dayValue));
      };

      let activeValue = base.active !== false;
      const active = createPillField(makeRow(uiText('active')), activeValue ? uiText('activeState') : uiText('pausedState'));
      active.onclick = async () => {
        const activeLabel=uiText('activeState'), pausedLabel=uiText('pausedState');
        const picked = await openChoiceModal(plugin.app, uiText('chooseActive'), [activeLabel,pausedLabel], activeValue ? activeLabel : pausedLabel);
        if (picked === null) return;
        activeValue = picked === activeLabel;
        active.setText(picked);
      };

      const refresh = () => {
        weeklyControl.parentElement.style.display = freq.value === 'weekly' ? '' : 'none';
        monthControl.parentElement.style.display = freq.value === 'yearly' ? '' : 'none';
        dayControl.parentElement.style.display = (freq.value === 'monthly' || freq.value === 'yearly') ? '' : 'none';
      };
      freq.onchange = () => { refreshDayLabel(); refresh(); };
      refreshDayLabel();
      refresh();

      const buttons = contentEl.createDiv({ cls:'momo-routine-editor-buttons' });
      if (existing) {
        const deleteAll = buttons.createEl('button', { text:uiText('routineDelete'), cls:'momo-routine-delete-all' });
        deleteAll.onclick = async () => {
          modal.close();
          await plugin.openRoutineDeleteDialog(existing, routines);
        };
      }
      const spacer = buttons.createDiv({ cls:'momo-routine-editor-spacer' });
      const cancel = buttons.createEl('button', { text:uiText('cancel') });
      const save = buttons.createEl('button', { text:uiText('save'), cls:'mod-cta' });
      cancel.onclick = () => { modal.close(); plugin.openRoutineManager(); };

      save.onclick = async () => {
        const name = title.value.trim();
        if (!name) { new Notice(uiText('enterRoutineName')); title.focus(); return; }

        const nextRoutine = {
          ...base,
          title:name,
          category:selectedCategory,
          group:selectedGroup,
          section:selectedCategory,
          time:time.value || null,
          freq:freq.value,
          days:freq.value === 'weekly' ? dayChecks.map((cb,i)=>cb.checked ? i+1 : null).filter(Boolean) : [],
          dayOfMonth:(freq.value === 'monthly' || freq.value === 'yearly') ? dayValue : null,
          monthOfYear:freq.value === 'yearly' ? monthValue : null,
          active:activeValue
        };

        if (nextRoutine.freq === 'weekly' && !nextRoutine.days.length) {
          new Notice(uiText('weeklyNeedsDay'));
          return;
        }

        const next = existing
          ? routines.map(r => r.id === existing.id ? nextRoutine : r)
          : [...routines, nextRoutine];

        await plugin.runUndoableAction(existing ? 'routine-edit' : 'routine-add', async () => {
          if (existing) {
            await plugin.reconcileSingleRoutineFromToday(existing, nextRoutine);
          }
          await plugin.saveRoutines(next);
          await plugin.runRoutineIntegrityPass({ force:true });
        });
        new Notice(uiText('routineSaved',{name,mode:existing?uiText('routineEditedWord'):uiText('routineAddedWord')}));
        modal.close();
        await plugin.openRoutineManager();
      };

      setTimeout(() => title.focus(), 30);
    };
    modal.open();
  }

  async openRoutineDeleteDialog(existing, routines) {
    const { Modal } = require('obsidian');
    const plugin = this;
    const modal = enableModalMotion(new Modal(this.app));

    modal.onOpen = () => {
      const { contentEl } = modal;
      contentEl.empty();
      contentEl.addClass('momo-routine-delete-modal');

      contentEl.createEl('h2', { text:uiText('routineDelete') });
      contentEl.createDiv({
        text:uiText('routineDeletePrompt',{name:existing.title}),
        cls:'momo-delete-sub'
      });

      const choices = contentEl.createDiv({ cls:'momo-delete-choices' });

      const addChoice = (title, description, mode) => {
        const button = choices.createEl('button', { cls:'momo-delete-choice' });
        button.createDiv({ text:title, cls:'momo-delete-choice-title' });
        button.createDiv({ text:description, cls:'momo-delete-choice-desc' });

        button.onclick = async () => {
          button.disabled = true;
          try {
            await plugin.runUndoableAction('routine-delete', async () => {
              if (mode === 'all' || mode === 'incomplete') {
                await deleteRoutineInstances(plugin.app, existing.id, mode);
              }
              const next = routines.filter(r => r.id !== existing.id);
              await plugin.saveRoutines(next);
            });

            const message = mode === 'all'
              ? uiText('routineDeletedAll')
              : mode === 'incomplete'
                ? uiText('routineDeletedIncomplete')
                : uiText('routineDeletedFuture');
            new Notice(message);

            modal.close();
            await plugin.openRoutineManager();
          } catch (error) {
            console.error('Momoan Todo · 루틴 삭제 실패', error);
            new Notice(uiText('routineDeleteFailed',{error:error.message || error}));
            button.disabled = false;
          }
        };
      };

      addChoice(uiText('deleteRoutineAll'), uiText('deleteRoutineAllDesc'), 'all');
      addChoice(uiText('deleteRoutineIncomplete'), uiText('deleteRoutineIncompleteDesc'), 'incomplete');
      addChoice(uiText('deleteRoutineFuture'), uiText('deleteRoutineFutureDesc'), 'future');

      const footer = contentEl.createDiv({ cls:'momo-delete-footer' });
      const cancel = footer.createEl('button', { text:uiText('cancel') });
      cancel.onclick = () => {
        modal.close();
        plugin.openRoutineEditor(existing);
      };
    };

    modal.open();
  }

  async openRoutineOverview() {
    await this.openRoutineManager();
  }

  async normalizeHistoricalRoutineTaxonomy() {
    const current = await this.loadData().catch(() => ({})) || {};
    if (Number(current.routineHistorySchemaVersion || 0) >= ROUTINE_HISTORY_SCHEMA_VERSION) return;

    const routines = await this.loadRoutines();
    const byId = new Map(routines.map(r => [r.id, r]));
    if (!byId.size) {
      await this.saveCategorySettings({
        routineHistorySchemaVersion:ROUTINE_HISTORY_SCHEMA_VERSION
      });
      return;
    }

    const files = this.app.vault.getFiles().filter(file =>
      file.path.startsWith(`${DATA_FOLDER}/`) && file.path.endsWith('.md')
    );

    let changedFiles = 0;
    let changedItems = 0;

    for (const file of files) {
      const outcome = await mutateTextFile(this.app, file, text => {
        const lines = text.split('\n');
        let currentDate = null;
        let localChanges = 0;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const h = line.trim().match(/^##\s+(\d{4}-\d{2}-\d{2})$/);
          if (h) { currentDate = h[1]; continue; }
          if (/^##\s+/.test(line)) { currentDate = null; continue; }
          if (!currentDate || !/^- \[[ xX]\] /.test(line)) continue;
          const item = parseTaskLine(line, i, file.path, currentDate);
          if (!item?.routineId) continue;
          const routine = byId.get(item.routineId);
          if (!routine) continue;
          const targetCategory = routine.category || '기타';
          const targetGroup = routine.group || '기타';
          if (item.category === targetCategory && item.group === targetGroup) continue;
          const nextLine = buildTaskLine(item, {
            category:targetCategory, group:targetGroup, done:item.done, preview:item.preview,
            skipped:item.skipped, suppressed:item.suppressed, suppressedReason:item.suppressedReason,
            movedFrom:item.movedFrom, occurrenceDate:item.occurrenceDate
          });
          if (nextLine !== line) { lines[i] = nextLine; localChanges += 1; }
        }
        return { text:localChanges ? lines.join('\n') : text, result:localChanges };
      });
      if (outcome.changed) changedFiles += 1;
      changedItems += Number(outcome.result || 0);
    }

    await this.saveCategorySettings({
      routineHistorySchemaVersion:ROUTINE_HISTORY_SCHEMA_VERSION
    });

    this.monthCache.clear();
    this.refreshViews();

    if (changedItems > 0) {
      new Notice(uiText('routineTaxonomyNormalized',{n:changedItems}));
    }
  }

  async reconcileRoutineOccurrencesFromToday() {
    const current = await this.loadData().catch(() => ({})) || {};
    if (Number(current.routineEngineSchemaVersion || 0) >= ROUTINE_ENGINE_SCHEMA_VERSION) return;

    const today = todaySeoul();
    const routines = await this.loadRoutines();
    const validIds = new Set(routines.map(r => r.id));

    const files = this.app.vault.getFiles().filter(file =>
      file.path.startsWith(`${DATA_FOLDER}/`) && file.path.endsWith('.md')
    );

    let changedFiles = 0;
    for (const file of files) {
      const outcome = await mutateTextFile(this.app, file, text => {
        const lines = text.split('\n');
        const out = [];
        let currentDate = null;
        let changed = false;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const h = line.trim().match(/^##\s+(\d{4}-\d{2}-\d{2})$/);
          if (h) { currentDate = h[1]; out.push(line); continue; }
          if (/^##\s+/.test(line)) { currentDate = null; out.push(line); continue; }
          if (!currentDate || currentDate < today || !/^- \[[ xX]\] /.test(line)) { out.push(line); continue; }
          const item = parseTaskLine(line, i, file.path, currentDate);
          if (!item?.routineId || !validIds.has(item.routineId)) { out.push(line); continue; }
          const preserveUserDecision = item.done || item.suppressed || item.skipped || item.movedFrom || item.occurrenceOverride;
          if (preserveUserDecision) { out.push(line); continue; }
          changed = true;
        }
        return changed ? out.join('\n') : text;
      });
      if (outcome.changed) changedFiles += 1;
    }

    await this.saveCategorySettings({
      routineEngineSchemaVersion:ROUTINE_ENGINE_SCHEMA_VERSION
    });
    this.monthCache.clear();

    if (changedFiles > 0) {
      new Notice(uiText('routineRecalculated'));
    }
  }

  async reconcileSingleRoutineFromToday(previousRoutine, nextRoutine) {
    if (!previousRoutine?.id || !nextRoutine?.id || previousRoutine.id !== nextRoutine.id) return;

    const today = todaySeoul();
    const files = this.app.vault.getFiles().filter(file =>
      file.path.startsWith(`${DATA_FOLDER}/`) && file.path.endsWith('.md')
    );

    for (const file of files) {
      await mutateTextFile(this.app, file, text => {
        const lines = text.split('\n');
        const out = [];
        let currentDate = null;
        let changed = false;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const h = line.trim().match(/^##\s+(\d{4}-\d{2}-\d{2})$/);
          if (h) { currentDate = h[1]; out.push(line); continue; }
          if (/^##\s+/.test(line)) { currentDate = null; out.push(line); continue; }
          if (!currentDate || !/^- \[[ xX]\] /.test(line) || !line.includes(`[routineId:: ${nextRoutine.id}]`)) { out.push(line); continue; }
          const item = parseTaskLine(line, i, file.path, currentDate);
          if (!item) { out.push(line); continue; }
          const preserveDecision = item.done || item.suppressed || item.skipped || item.movedFrom || item.occurrenceOverride;
          if (currentDate < today || preserveDecision) {
            const nextLine = (item.done || item.occurrenceOverride) ? line : buildTaskLine(item, {
              title:nextRoutine.title,
              category:nextRoutine.category || item.category,
              group:nextRoutine.group || '기타',
              time:nextRoutine.time || null,
              occurrenceDate:item.occurrenceDate || item.movedFrom || item.date
            });
            out.push(nextLine);
            if (nextLine !== line) changed = true;
            continue;
          }
          changed = true;
        }
        return changed ? out.join('\n') : text;
      });
    }

    this.monthCache.clear();
  }

  routineDefinitionSignature(routine) {
    const freq = routine?.freq || 'daily';
    const days = freq === 'weekly'
      ? [...new Set((routine.days || []).map(Number).filter(n => n >= 1 && n <= 7))].sort((a,b) => a-b)
      : [];
    return JSON.stringify([
      String(routine?.title || '').trim(),
      String(routine?.time || ''),
      freq,
      days,
      (freq === 'monthly' || freq === 'yearly') ? Number(routine?.dayOfMonth || 1) : null,
      freq === 'yearly' ? Number(routine?.monthOfYear || 1) : null,
      routine?.active === false ? 0 : 1
    ]);
  }

  routineDefinitionScore(routine) {
    let score = 0;
    const category = routine?.category || '기타';
    const group = routine?.group || '기타';
    if (category !== '기타') score += 10;
    if (group !== '기타') score += 5;
    if (routine?.section && routine.section === category) score += 1;
    if (category === '생활' && group === '루틴') score += 1;
    return score;
  }

  canSafelyMergeRoutineDefinitions(a, b) {
    const ac = a?.category || '기타', bc = b?.category || '기타';
    const ag = a?.group || '기타', bg = b?.group || '기타';
    if (ac === bc && ag === bg) return true;
    if (ac === '기타' || bc === '기타') return true;
    if (ac === bc && (ag === '기타' || bg === '기타')) return true;
    return false;
  }

  async repairDuplicateRoutineDefinitions() {
    const routines = await this.loadRoutines();
    if (routines.length < 2) return { routines, aliases:new Map(), changed:false };

    const groups = new Map();
    routines.forEach((routine, index) => {
      const key = this.routineDefinitionSignature(routine);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ routine, index });
    });

    const removed = new Set();
    const aliases = new Map();

    for (const entries of groups.values()) {
      if (entries.length < 2) continue;
      const mergeable = entries.every((entry, i) =>
        entries.slice(i + 1).every(other => this.canSafelyMergeRoutineDefinitions(entry.routine, other.routine))
      );
      if (!mergeable) continue;

      let keep = entries[0];
      for (const entry of entries.slice(1)) {
        if (this.routineDefinitionScore(entry.routine) > this.routineDefinitionScore(keep.routine)) keep = entry;
      }

      for (const entry of entries) {
        if (entry === keep) continue;
        removed.add(entry.index);
        aliases.set(entry.routine.id, keep.routine.id);
      }
    }

    if (!removed.size) return { routines, aliases, changed:false };

    const next = routines.filter((_, index) => !removed.has(index));
    await this.saveRoutines(next);
    console.info(`Momoan Todo · 중복 루틴 정의 ${removed.size}개를 하나로 정리했습니다.`);
    return { routines:next, aliases, changed:true };
  }

  async repairRoutineLinkedState(routines, aliases=new Map()) {
    const today = todaySeoul();
    const activeEnd = shiftDay(today, 6);
    const previewEnd = shiftMonth(today, 12);
    const byId = new Map(routines.map(r => [r.id, r]));
    const files = this.app.vault.getFiles().filter(file =>
      file.path.startsWith(`${DATA_FOLDER}/`) && file.path.endsWith('.md')
    );

    let changedFiles = 0;
    for (const file of files) {
      const outcome = await mutateTextFile(this.app, file, text => {
        const lines = text.split('\n');
        const out = [];
        const seen = new Map();
        let currentDate = null;
        let changed = false;

        for (let i=0; i<lines.length; i++) {
          const line = lines[i];
          const h = line.trim().match(/^##\s+(\d{4}-\d{2}-\d{2})$/);
          if (h) { currentDate = h[1]; out.push(line); continue; }
          if (/^##\s+/.test(line)) { currentDate = null; out.push(line); continue; }
          if (!currentDate || currentDate < today || !/^- \[[ xX]\] /.test(line)) { out.push(line); continue; }

          const item = parseTaskLine(line, i, file.path, currentDate);
          if (!item?.routineId) { out.push(line); continue; }
          const canonicalId = aliases.get(item.routineId) || item.routineId;
          const routine = byId.get(canonicalId);
          if (!routine) { out.push(line); continue; }

          const occurrenceDate = item.occurrenceDate || item.movedFrom || currentDate;
          const preserveDecision = item.done || item.suppressed || item.skipped || item.movedFrom || item.occurrenceOverride;
          let nextLine = line;
          let rank = 1;

          if (preserveDecision) {
            nextLine = buildTaskLine(item, {
              routineId:canonicalId,
              occurrenceDate,
              occurrenceOverride:Boolean(item.occurrenceOverride || item.movedFrom)
            });
            rank = item.done ? 5 : 4;
          } else {
            const status = expectedRoutineStatus(routine, currentDate, today, activeEnd, previewEnd);
            if (!status) { changed = true; continue; }
            nextLine = buildTaskLine(item, {
              routineId:canonicalId,
              title:routine.title,
              category:routine.category || '기타',
              group:routine.group || '기타',
              time:routine.time || null,
              occurrenceDate:currentDate,
              movedFrom:null,
              suppressed:false,
              suppressedReason:null,
              skipped:false,
              preview:status === 'preview',
              done:false
            });
            rank = status === 'active' ? 3 : 2;
          }

          const dedupeKey = `${currentDate}::${canonicalId}::${occurrenceDate}`;
          if (seen.has(dedupeKey)) {
            const prev = seen.get(dedupeKey);
            if (rank > prev.rank) {
              out[prev.outIndex] = nextLine;
              seen.set(dedupeKey, { outIndex:prev.outIndex, rank });
            }
            changed = true;
            continue;
          }
          const outIndex = out.length;
          out.push(nextLine);
          seen.set(dedupeKey, { outIndex, rank });
          if (nextLine !== line) changed = true;
        }
        return changed ? out.join('\n') : text;
      });
      if (outcome.changed) changedFiles += 1;
    }

    if (changedFiles) this.monthCache.clear();
    return changedFiles;
  }

  async collectRoutineOccurrenceRecords(routines) {
    await waitForPendingFileMutations();
    const today = todaySeoul();
    const validIds = new Set((routines || []).map(r => r?.id).filter(Boolean));
    const files = this.app.vault.getFiles().filter(file =>
      file.path.startsWith(`${DATA_FOLDER}/`) && file.path.endsWith('.md')
    );
    const records = [];

    for (const file of files) {
      const text = await this.app.vault.read(file);
      let currentDate = null;
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const h = line.trim().match(/^##\s+(\d{4}-\d{2}-\d{2})$/);
        if (h) { currentDate = h[1]; continue; }
        if (/^##\s+/.test(line)) { currentDate = null; continue; }
        if (!currentDate || !/^- \[[ xX]\] /.test(line)) continue;
        const item = parseTaskLine(line, i, file.path, currentDate);
        if (!item?.routineId || !validIds.has(item.routineId)) continue;
        const occurrenceDate = item.occurrenceDate || item.movedFrom || currentDate;
        if (!occurrenceDate || occurrenceDate < today) continue;
        records.push({
          key:`${item.routineId}::${occurrenceDate}`,
          filePath:file.path,
          currentDate,
          lineIndex:i,
          raw:line,
          occurrenceDate,
          item
        });
      }
    }
    return records;
  }

  async repairRoutineOccurrenceCollisions(routines) {
    const records = await this.collectRoutineOccurrenceRecords(routines);
    if (!records.length) return 0;

    const groups = new Map();
    for (const record of records) {
      if (!groups.has(record.key)) groups.set(record.key, []);
      groups.get(record.key).push(record);
    }

    const actionsByFile = new Map();
    const queueAction = (record, replacement=null) => {
      if (!actionsByFile.has(record.filePath)) actionsByFile.set(record.filePath, []);
      actionsByFile.get(record.filePath).push({
        date:record.currentDate,
        raw:record.raw,
        replacement
      });
    };

    for (const group of groups.values()) {
      const active = group.filter(r => !r.item.suppressed && !r.item.skipped);
      if (!active.length) continue;

      const movedLike = r => Boolean(r.item.movedFrom || r.item.occurrenceOverride || r.currentDate !== r.occurrenceDate);
      const movedActive = active.filter(movedLike);
      const doneActive = active.filter(r => r.item.done);
      const inactiveDecision = group.some(r => r.item.suppressed || r.item.skipped);

      let winner = null;
      if (movedActive.length || doneActive.length || !inactiveDecision) {
        const rank = r => {
          let score = 0;
          if (r.item.done) score += 600;
          if (movedLike(r)) score += 500;
          if (!r.item.preview) score += 40;
          if (r.currentDate === r.occurrenceDate) score += 20;
          return score;
        };
        winner = [...active].sort((a,b) => rank(b) - rank(a))[0] || null;
      }

      const losers = winner ? active.filter(r => r !== winner) : active;
      if (!losers.length) continue;

      const keepMovedOverride = winner && Boolean(winner.item.movedFrom || winner.currentDate !== winner.occurrenceDate);
      const sourceAlreadyBlocked = group.some(r =>
        (r.item.suppressed || r.item.skipped) && r.currentDate === r.occurrenceDate
      );
      let sourceBlockPlanned = sourceAlreadyBlocked;

      for (const loser of losers) {
        if (keepMovedOverride && loser.currentDate === loser.occurrenceDate && !sourceBlockPlanned) {
          queueAction(loser, buildTaskLine(loser.item, {
            preview:false,
            skipped:false,
            suppressed:true,
            suppressedReason:'moved',
            done:false,
            movedFrom:null,
            occurrenceDate:loser.occurrenceDate,
            occurrenceOverride:true
          }));
          sourceBlockPlanned = true;
        } else {
          queueAction(loser, null);
        }
      }
    }

    let changedFiles = 0;
    for (const [filePath, actions] of actionsByFile) {
      if (!actions.length) continue;
      const outcome = await mutateTextFile(this.app, filePath, text => {
        const lines = text.split('\n');
        let changed = false;
        for (const action of actions) {
          let currentDate = null;
          let index = -1;
          for (let i = 0; i < lines.length; i++) {
            const h = lines[i].trim().match(/^##\s+(\d{4}-\d{2}-\d{2})$/);
            if (h) { currentDate = h[1]; continue; }
            if (/^##\s+/.test(lines[i])) { currentDate = null; continue; }
            if (currentDate === action.date && lines[i] === action.raw) { index = i; break; }
          }
          if (index < 0) continue;
          if (action.replacement === null) lines.splice(index, 1);
          else lines[index] = action.replacement;
          changed = true;
        }
        return changed ? lines.join('\n') : text;
      });
      if (outcome.changed) changedFiles += 1;
    }

    if (changedFiles) {
      this.monthCache.clear();
      console.info(`Momoan Todo · 루틴 회차 충돌 ${changedFiles}개 파일을 정리했습니다.`);
    }
    return changedFiles;
  }

  async collectRoutineOccurrenceDecisionKeys(routines) {
    const records = await this.collectRoutineOccurrenceRecords(routines);
    const blocked = new Set();
    for (const record of records) {
      const item = record.item;
      const userDecision = item.done || item.suppressed || item.skipped || item.movedFrom ||
        item.occurrenceOverride || record.currentDate !== record.occurrenceDate;
      if (userDecision) blocked.add(record.key);
    }
    return blocked;
  }

  async cleanupLegacyRoutineDuplicates(routines) {
    const today = todaySeoul();
    const byTitleTime = new Map();
    for (const routine of routines) {
      if (routine.active === false) continue;
      const key = `${String(routine.title || '').trim()}\u0000${String(routine.time || '')}`;
      if (!byTitleTime.has(key)) byTitleTime.set(key, []);
      byTitleTime.get(key).push(routine);
    }
    const files = this.app.vault.getFiles().filter(file =>
      file.path.startsWith(`${DATA_FOLDER}/`) && file.path.endsWith('.md')
    );
    let changedFiles = 0;

    for (const file of files) {
      const outcome = await mutateTextFile(this.app, file, text => {
        const lines = text.split('\n');
        const parsed = [];
        const linked = new Set();
        let currentDate = null;
        for (let i=0; i<lines.length; i++) {
          const line = lines[i];
          const h = line.trim().match(/^##\s+(\d{4}-\d{2}-\d{2})$/);
          if (h) { currentDate = h[1]; continue; }
          if (/^##\s+/.test(line)) { currentDate = null; continue; }
          if (!currentDate || currentDate < today || !/^- \[[ xX]\] /.test(line)) continue;
          const item = parseTaskLine(line, i, file.path, currentDate);
          if (!item) continue;
          parsed.push({ item, index:i });
          if (item.routineId) linked.add(`${currentDate}\u0000${String(item.title || '').trim()}\u0000${String(item.time || '')}`);
        }
        const remove = new Set();
        for (const {item,index} of parsed) {
          if (item.routineId) continue;
          const titleTime = `${String(item.title || '').trim()}\u0000${String(item.time || '')}`;
          const datedKey = `${item.date}\u0000${titleTime}`;
          if (linked.has(datedKey)) { remove.add(index); continue; }
          const candidates = byTitleTime.get(titleTime) || [];
          if (candidates.length !== 1) continue;
          const routine = candidates[0];
          const taxonomyDiff = item.category !== (routine.category || '기타') || (item.group || '기타') !== (routine.group || '기타');
          const looksLegacyGeneric = item.category === '기타' || item.group === '기타';
          if (taxonomyDiff && looksLegacyGeneric) remove.add(index);
        }
        return remove.size ? lines.filter((_, index) => !remove.has(index)).join('\n') : text;
      });
      if (outcome.changed) changedFiles += 1;
    }
    if (changedFiles) this.monthCache.clear();
    return changedFiles;
  }

  async adoptLegacyRoutineOccurrences(routines) {
    const current = await this.loadData().catch(() => ({})) || {};
    if (Number(current.routineLinkSchemaVersion || 0) >= ROUTINE_LINK_SCHEMA_VERSION) return 0;
    const today = todaySeoul();
    const activeEnd = shiftDay(today, 6);
    const previewEnd = shiftMonth(today, 12);
    const active = (routines || []).filter(r => r?.id && r.active !== false);
    const files = this.app.vault.getFiles().filter(file =>
      file.path.startsWith(`${DATA_FOLDER}/`) && file.path.endsWith('.md')
    );
    let adopted = 0;

    for (const file of files) {
      const outcome = await mutateTextFile(this.app, file, text => {
        const lines = text.split('\n');
        let currentDate = null;
        const linkedOnDate = new Set();
        let localAdopted = 0;
        for (let i=0; i<lines.length; i++) {
          const h = lines[i].trim().match(/^##\s+(\d{4}-\d{2}-\d{2})$/);
          if (h) { currentDate = h[1]; continue; }
          if (/^##\s+/.test(lines[i])) { currentDate = null; continue; }
          if (!currentDate || currentDate < today || !/^- \[[ xX]\] /.test(lines[i])) continue;
          const item = parseTaskLine(lines[i], i, file.path, currentDate);
          if (item?.routineId) linkedOnDate.add(`${currentDate}::${item.routineId}::${item.occurrenceDate || currentDate}`);
        }
        currentDate = null;
        for (let i=0; i<lines.length; i++) {
          const h = lines[i].trim().match(/^##\s+(\d{4}-\d{2}-\d{2})$/);
          if (h) { currentDate = h[1]; continue; }
          if (/^##\s+/.test(lines[i])) { currentDate = null; continue; }
          if (!currentDate || currentDate < today || currentDate > previewEnd || !/^- \[[ xX]\] /.test(lines[i])) continue;
          const item = parseTaskLine(lines[i], i, file.path, currentDate);
          if (!item || item.routineId || item.done || item.suppressed || item.skipped) continue;
          const candidates = active.filter(routine => {
            const status = expectedRoutineStatus(routine, currentDate, today, activeEnd, previewEnd);
            return Boolean(status) && String(routine.title || '').trim() === String(item.title || '').trim() &&
              String(routine.time || '') === String(item.time || '') &&
              (routine.category || '기타') === (item.category || '기타') &&
              (routine.group || '기타') === (item.group || '기타');
          });
          if (candidates.length !== 1) continue;
          const routine = candidates[0];
          const key = `${currentDate}::${routine.id}::${currentDate}`;
          if (linkedOnDate.has(key)) continue;
          lines[i] = buildTaskLine(item, {
            routineId:routine.id,
            occurrenceDate:currentDate,
            preview:expectedRoutineStatus(routine, currentDate, today, activeEnd, previewEnd) === 'preview'
          });
          linkedOnDate.add(key);
          localAdopted += 1;
        }
        return { text:localAdopted ? lines.join('\n') : text, result:localAdopted };
      });
      adopted += Number(outcome.result || 0);
    }
    await this.saveCategorySettings({ routineLinkSchemaVersion:ROUTINE_LINK_SCHEMA_VERSION });
    if (adopted) this.monthCache.clear();
    return adopted;
  }

  async auditRoutineOccurrenceIntegrity(routines) {
    await waitForPendingFileMutations();
    const today = todaySeoul();
    const validIds = new Set((routines || []).map(r => r?.id).filter(Boolean));
    const files = this.app.vault.getFiles().filter(file =>
      file.path.startsWith(`${DATA_FOLDER}/`) && file.path.endsWith('.md')
    );
    let duplicateActive = 0;
    let orphanActive = 0;
    const seen = new Set();
    for (const file of files) {
      const text = await this.app.vault.read(file);
      let currentDate = null;
      for (const line of text.split('\n')) {
        const h = line.trim().match(/^##\s+(\d{4}-\d{2}-\d{2})$/);
        if (h) { currentDate = h[1]; continue; }
        if (/^##\s+/.test(line)) { currentDate = null; continue; }
        if (!currentDate || !/^- \[[ xX]\] /.test(line)) continue;
        const rid = (line.match(/\[routineId::\s*([^\]]+)\]/)||[])[1] || null;
        if (!rid) continue;
        const suppressed = /\[momoSuppressed::\s*true\]/.test(line);
        const skipped = /\[momoSkipped::\s*true\]/.test(line);
        if (suppressed || skipped) continue;
        const explicitOccurrence = (line.match(/\[momoOccurrence::\s*(\d{4}-\d{2}-\d{2})\]/)||[])[1] || null;
        const movedFrom = (line.match(/\[momoMovedFrom::\s*(\d{4}-\d{2}-\d{2})\]/)||[])[1] || null;
        const occurrenceDate = explicitOccurrence || movedFrom || currentDate;
        if (occurrenceDate < today) continue;
        if (!validIds.has(rid)) orphanActive += 1;
        const key = `${rid}::${occurrenceDate}`;
        if (seen.has(key)) duplicateActive += 1;
        else seen.add(key);
      }
    }
    return { duplicateActive, orphanActive };
  }

  async runRoutineIntegritySelfCheck(routines) {
    const first = await this.auditRoutineOccurrenceIntegrity(routines);
    if (first.duplicateActive > 0) {
      console.warn(`Momoan Todo · invariant: active routine duplicate ${first.duplicateActive}건 감지, 자동 복구를 시도합니다.`);
      await this.repairRoutineLinkedState(routines);
      await this.repairRoutineOccurrenceCollisions(routines);
      const second = await this.auditRoutineOccurrenceIntegrity(routines);
      if (second.duplicateActive > 0) {
        console.error(`Momoan Todo · invariant failure: active routine duplicate ${second.duplicateActive}건이 남아 있습니다.`);
      }
      if (second.orphanActive > 0) {
        console.warn(`Momoan Todo · invariant: source routine이 없는 active occurrence ${second.orphanActive}건이 남아 있습니다.`);
      }
      return second;
    }
    if (first.orphanActive > 0) {
      console.warn(`Momoan Todo · invariant: source routine이 없는 active occurrence ${first.orphanActive}건이 있습니다.`);
    }
    return first;
  }

  async ensureRoutineOccurrences() {
    if (this._routineEnsurePromise) return this._routineEnsurePromise;
    this._routineEnsurePromise = this._ensureRoutineOccurrencesLocked();
    try {
      return await this._routineEnsurePromise;
    } finally {
      this._routineEnsurePromise = null;
    }
  }

  async _ensureRoutineOccurrencesLocked() {
    const repaired = await this.repairDuplicateRoutineDefinitions();
    const allRoutines = repaired.routines;
    if (!allRoutines.length) return;

    // Old builds could leave routine-looking tasks without routineId. Link only
    // unambiguous exact matches once so moving/editing them suppresses the source
    // occurrence instead of letting the engine recreate it.
    await this.adoptLegacyRoutineOccurrences(allRoutines);

    // 매번 현재 루틴 정의를 정본으로 삼아 오늘 이후의 미결정 인스턴스를
    // 재검증합니다. 외부 Sync나 과거 버전이 만든 잘못된 분류/요일/중복도 여기서 정리됩니다.
    await this.repairRoutineLinkedState(allRoutines, repaired.aliases);
    // A moved/edited occurrence can live on a different date (or month) from its
    // source occurrence. Repair globally by routineId + occurrenceDate before
    // generating anything so a stale synced source row cannot come back to life.
    await this.repairRoutineOccurrenceCollisions(allRoutines);
    const occurrenceDecisionKeys = await this.collectRoutineOccurrenceDecisionKeys(allRoutines);

    const routines = allRoutines.filter(r => r.active !== false);
    const today = todaySeoul();
    const activeEnd = shiftDay(today, 6);
    const previewEnd = shiftMonth(today, 12);

    for (const routine of routines) {
      const freq = routine.freq || 'daily';

      if (['daily','weekdays','weekends','weekly'].includes(freq)) {
        const dates = getRoutineDatesInRange(routine, today, activeEnd);
        for (const date of dates) {
          await this.ensureRoutineOccurrence(routine, date, 'active', occurrenceDecisionKeys);
        }
        continue;
      }

      if (['monthly','monthly-last'].includes(freq)) {
        const dates = getRoutineDatesInRange(routine, today, previewEnd);
        for (const date of dates) {
          const status = date <= activeEnd ? 'active' : 'preview';
          await this.ensureRoutineOccurrence(routine, date, status, occurrenceDecisionKeys);
        }
        continue;
      }

      if (freq === 'yearly') {
        const dates = getRoutineDatesInRange(routine, today, previewEnd);
        for (const date of dates) {
          const status = date <= activeEnd ? 'active' : 'preview';
          await this.ensureRoutineOccurrence(routine, date, status, occurrenceDecisionKeys);
        }
      }
    }

    // 과거 엔진이 routineId 없이 남긴 동일 제목/시간의 복제본을 마지막에 정리합니다.
    await this.cleanupLegacyRoutineDuplicates(allRoutines);
    await this.runRoutineIntegritySelfCheck(allRoutines);

    this.monthCache.clear();
    this.refreshViews();
  }

  async ensureRoutineOccurrence(routine, date, status='active', occurrenceDecisionKeys=null) {
    if (occurrenceDecisionKeys?.has(`${routine.id}::${date}`)) return;
    const path = `${DATA_FOLDER}/${date.slice(0,7)}.md`;
    const base = `---\ntype: task-log\nmonth: ${date.slice(0,7)}\n---\n\n# ${date.slice(0,7)}\n`;
    const item = {
      title:routine.title,
      category:routine.category || '기타',
      group:routine.group || '기타',
      date,
      time:routine.time || null,
      location:null,
      done:false,
      suppressed:false,
      routineId:routine.id,
      occurrenceDate:date,
      movedFrom:null,
      preview:status === 'preview',
      skipped:false,
      occurrenceOverride:false
    };
    const desiredLine = buildTaskLine(item, {
      preview:status === 'preview', skipped:false, suppressed:false, done:false
    });

    await mutateTextFile(this.app, path, original => {
      let text = ensureDateSectionText(original, date);
      const lines = text.split('\n');
      let currentDate = null;
      let occurrenceIndex = -1;
      let previewIndex = -1;
      let blocked = false;

      for (let i = 0; i < lines.length; i++) {
        const h = lines[i].trim().match(/^##\s+(\d{4}-\d{2}-\d{2})$/);
        if (h) { currentDate = h[1]; continue; }
        if (/^##\s+/.test(lines[i])) { currentDate = null; continue; }
        if (currentDate !== date || !/^- \[[ xX]\] /.test(lines[i])) continue;
        const rid = (lines[i].match(/\[routineId::\s*([^\]]+)\]/)||[])[1] || null;
        if (rid !== routine.id) continue;
        const explicitOccurrence = (lines[i].match(/\[momoOccurrence::\s*(\d{4}-\d{2}-\d{2})\]/)||[])[1] || null;
        const movedFrom = (lines[i].match(/\[momoMovedFrom::\s*(\d{4}-\d{2}-\d{2})\]/)||[])[1] || null;
        if ((explicitOccurrence || movedFrom || currentDate) !== date) continue;
        const isSkipped = /\[momoSkipped::\s*true\]/.test(lines[i]);
        const isSuppressed = /\[momoSuppressed::\s*true\]/.test(lines[i]);
        const isPreview = /\[momoPreview::\s*true\]/.test(lines[i]);
        occurrenceIndex = i;
        if (isSkipped || isSuppressed) blocked = true;
        if (isPreview) previewIndex = i;
        break;
      }

      if (blocked) return text;
      if (occurrenceIndex >= 0) {
        if (status === 'active' && previewIndex >= 0) {
          lines[previewIndex] = desiredLine;
          return lines.join('\n');
        }
        return text;
      }

      const heading = `## ${date}`;
      const start = text.indexOf(heading);
      if (start < 0) return text;
      const bodyStart = start + heading.length;
      const nextHeading = text.indexOf('\n## ', bodyStart);
      const end = nextHeading >= 0 ? nextHeading : text.length;
      const before = text.slice(0, end).trimEnd();
      const after = text.slice(end);
      return `${before}\n${desiredLine}\n${after.startsWith('\n') ? after : '\n' + after}`;
    }, { createContent:base });
  }


  async getMonthData(month) {
    const path = `${DATA_FOLDER}/${month}.md`;
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!file) return new Map();
    const mtime = file.stat?.mtime || 0;
    const cached = this.monthCache.get(month);
    if (cached && cached.mtime === mtime) return cached.map;

    const routines = await this.loadRoutines();
    const validRoutineIds = new Set(routines.map(r => r.id));
    const outcome = await mutateTextFile(this.app, file, current => {
      const cleaned = cleanRoutineGhostLines(current, validRoutineIds);
      return { text:cleaned.changed ? cleaned.text : current, result:cleaned.changed ? cleaned.text : current };
    });
    const text = typeof outcome.result === 'string' ? outcome.result : await this.app.vault.read(file);
    const map = parseMonthFile(text, path);
    const freshFile = this.app.vault.getAbstractFileByPath(path);
    this.monthCache.set(month, { mtime:freshFile?.stat?.mtime || mtime, map });
    return map;
  }


  async getItemsForDate(date) {
    const month = date.slice(0,7);
    const map = await this.getMonthData(month);
    return map.get(date) || [];
  }

  hideGroup(category, group) {
    if (!group || group === '기타' || group === '루틴') return;
    try {
      const hiddenKey = `momo.todo.hiddenGroups.${category}`;
      const hidden = JSON.parse(momoLocalGet(hiddenKey) || '[]');
      const nextHidden = [group, ...(Array.isArray(hidden) ? hidden.filter(x => x !== group) : [])].slice(0, 50);
      momoLocalSet(hiddenKey, JSON.stringify(nextHidden));

      const recentKey = `momo.todo.recentGroups.${category}`;
      const recent = JSON.parse(momoLocalGet(recentKey) || '[]');
      if (Array.isArray(recent)) {
        momoLocalSet(recentKey, JSON.stringify(recent.filter(x => x !== group)));
      }

      const lastKey = `momo.todo.lastGroup.${category}`;
      if (momoLocalGet(lastKey) === group) momoLocalSet(lastKey, '__none__');
      new Notice(uiText('groupHidden',{category,group}));
    } catch (_) {
      new Notice(uiText('groupHideFailed'));
    }
    this.refreshViews();
  }
}


function enableNativeDatePicker(input) {
  if (!input) return input;
  const open = () => { try { if (typeof input.showPicker === 'function') input.showPicker(); } catch (_) {} };
  input.addEventListener('click', open);
  input.addEventListener('focus', open);
  return input;
}



function enableModalMotion(modal) {
  if (!modal || modal.__momoMotionEnabled) return modal;
  modal.__momoMotionEnabled = true;

  const originalClose = modal.close.bind(modal);
  let closing = false;

  modal.close = () => {
    if (closing) return;
    const el = modal.modalEl;
    if (!el || !el.isConnected) {
      originalClose();
      return;
    }
    closing = true;
    try { el.classList.add('momo-modal-closing'); } catch (_) {}
    setTimeout(() => originalClose(), 120);
  };
  return modal;
}

async function openTextPrompt(app, title, placeholder='', current='') {
  const { Modal } = require('obsidian');
  return await new Promise((resolve) => {
    const modal = enableModalMotion(new Modal(app));
    let settled = false;
    modal.onOpen = () => {
      const { contentEl } = modal;
      contentEl.empty();
      contentEl.addClass('momo-text-prompt-modal');
      contentEl.createEl('h2', { text:title });
      const input = stabilizeTextInput(contentEl.createEl('input', { cls:'momo-text-prompt-input' }));
      input.type = 'text';
      input.placeholder = placeholder;
      input.value = current || '';
      const buttons = contentEl.createDiv({ cls:'momo-text-prompt-actions' });
      const cancel = buttons.createEl('button', { text:uiText('cancel') });
      const save = buttons.createEl('button', { text:uiText('confirm'), cls:'mod-cta' });
      const finish = () => {
        const value = normalizeCategoryName(input.value);
        if (!value) { input.focus(); return; }
        settled = true;
        modal.close();
        resolve(value);
      };
      cancel.onclick = () => modal.close();
      save.onclick = finish;
      input.addEventListener('keydown', ev => {
        if (ev.key === 'Enter' && !ev.isComposing) { ev.preventDefault(); finish(); }
      });
      setTimeout(() => { input.focus(); input.select(); }, 30);
    };
    modal.onClose = () => { if (!settled) resolve(null); };
    modal.open();
  });
}

async function openChoiceModal(app, title, choices, current=null) {
  const { Modal } = require('obsidian');
  return await new Promise((resolve) => {
    const modal = enableModalMotion(new Modal(app));
    let settled = false;
    let selectedValue = null;
    modal.onOpen = () => {
      const { contentEl } = modal;
      contentEl.empty();
      contentEl.addClass('momo-choice-modal');
      contentEl.createEl('h2', { text:title });
      const list = contentEl.createDiv({ cls:'momo-choice-list' });
      for (const value of choices) {
        const b = list.createEl('button', { text:value || uiText('none'), cls:'momo-choice-item' });
        if (value === current) b.addClass('is-current');
        b.onclick = () => {
          settled = true;
          selectedValue = value;
          modal.close();
        };
      }
    };
    modal.onClose = () => resolve(settled ? selectedValue : null);
    modal.open();
  });
}


async function openDateChoiceModal(app, current='') {
  const { Modal } = require('obsidian');
  return await new Promise((resolve) => {
    const modal = enableModalMotion(new Modal(app));
    let settled = false;
    let selectedValue = null;
    const base = current && /^\d{4}-\d{2}-\d{2}$/.test(current) ? new Date(`${current}T12:00:00`) : new Date(`${todaySeoul()}T12:00:00`);
    let y = base.getFullYear();
    let m = base.getMonth();

    const format = (yy,mm,dd) => `${yy}-${String(mm+1).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;

    modal.onOpen = () => {
      const { contentEl } = modal;
      contentEl.empty();
      contentEl.addClass('momo-date-choice-modal');

      const head = contentEl.createDiv({ cls:'momo-date-choice-head' });
      const prev = head.createEl('button', { text:'‹', cls:'momo-date-nav' });
      const title = head.createDiv({ cls:'momo-date-choice-title' });
      const next = head.createEl('button', { text:'›', cls:'momo-date-nav' });

      const weekdays = contentEl.createDiv({ cls:'momo-date-weekdays' });
      for (const d of activeWeekdayLabels()) weekdays.createSpan({ text:d });

      const grid = contentEl.createDiv({ cls:'momo-date-grid' });

      const finish = (value) => {
        settled = true;
        selectedValue = value;
        modal.close();
      };

      const render = () => {
        title.setText(localizedMonthYear(y,m));
        grid.empty();
        const first = leadingDaysForWeek(new Date(y,m,1).getDay());
        const days = new Date(y,m+1,0).getDate();
        for (let i=0;i<first;i++) grid.createDiv({ cls:'momo-date-empty' });
        for (let d=1;d<=days;d++) {
          const value = format(y,m,d);
          const b = grid.createEl('button', { text:String(d), cls:'momo-date-cell' });
          if (value === current) b.addClass('is-current');
          if (value === todaySeoul()) b.addClass('is-today');
          b.onclick = () => finish(value);
        }
      };

      prev.onclick = () => {
        m -= 1;
        if (m < 0) { m = 11; y -= 1; }
        render();
      };
      next.onclick = () => {
        m += 1;
        if (m > 11) { m = 0; y += 1; }
        render();
      };

      const foot = contentEl.createDiv({ cls:'momo-date-choice-foot' });
      const clear = foot.createEl('button', { text:uiText('noDate') });
      clear.onclick = () => finish('');
      const today = foot.createEl('button', { text:uiText('today') });
      today.onclick = () => finish(todaySeoul());

      render();
    };
    modal.onClose = () => resolve(settled ? selectedValue : null);
    modal.open();
  });
}


async function openMultiDateChoiceModal(app, initialMonthDate=todaySeoul()) {
  const { Modal } = require('obsidian');
  return await new Promise((resolve) => {
    const modal = enableModalMotion(new Modal(app));
    let settled = false;
    const base = initialMonthDate && /^\d{4}-\d{2}-\d{2}$/.test(initialMonthDate)
      ? new Date(`${initialMonthDate}T12:00:00`)
      : new Date(`${todaySeoul()}T12:00:00`);
    let y = base.getFullYear();
    let m = base.getMonth();
    const selected = new Set();

    const format = (yy,mm,dd) => `${yy}-${String(mm+1).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;

    modal.onOpen = () => {
      const { contentEl } = modal;
      contentEl.empty();
      contentEl.addClass('momo-date-choice-modal');
      contentEl.addClass('momo-multi-date-choice-modal');

      const head = contentEl.createDiv({ cls:'momo-date-choice-head' });
      const prev = head.createEl('button', { text:'‹', cls:'momo-date-nav' });
      const title = head.createDiv({ cls:'momo-date-choice-title' });
      const next = head.createEl('button', { text:'›', cls:'momo-date-nav' });

      const weekdays = contentEl.createDiv({ cls:'momo-date-weekdays' });
      for (const d of activeWeekdayLabels()) weekdays.createSpan({ text:d });

      const grid = contentEl.createDiv({ cls:'momo-date-grid' });

      const foot = contentEl.createDiv({ cls:'momo-date-choice-foot momo-multi-date-foot' });
      const clear = foot.createEl('button', { text:uiText('clearSelection') });
      const today = foot.createEl('button', { text:uiText('today') });
      const confirm = foot.createEl('button', { text:uiText('chooseDate'), cls:'mod-cta momo-multi-date-confirm' });

      const refreshConfirm = () => {
        const count = selected.size;
        confirm.setText(count ? uiText('generatedCountDates',{n:count}) : uiText('chooseDate'));
        confirm.disabled = count === 0;
      };

      const render = () => {
        title.setText(localizedMonthYear(y,m));
        grid.empty();

        const first = leadingDaysForWeek(new Date(y,m,1).getDay());
        const days = new Date(y,m+1,0).getDate();
        for (let i=0;i<first;i++) grid.createDiv({ cls:'momo-date-empty' });

        for (let d=1;d<=days;d++) {
          const value = format(y,m,d);
          const b = grid.createEl('button', { text:String(d), cls:'momo-date-cell' });
          if (value === todaySeoul()) b.addClass('is-today');
          if (selected.has(value)) b.addClass('is-selected');

          b.onclick = () => {
            if (selected.has(value)) selected.delete(value);
            else selected.add(value);
            render();
            refreshConfirm();
          };
        }
      };

      prev.onclick = () => {
        m -= 1;
        if (m < 0) { m = 11; y -= 1; }
        render();
      };
      next.onclick = () => {
        m += 1;
        if (m > 11) { m = 0; y += 1; }
        render();
      };

      clear.onclick = () => {
        selected.clear();
        render();
        refreshConfirm();
      };

      today.onclick = () => {
        const t = todaySeoul();
        const d = new Date(`${t}T12:00:00`);
        y = d.getFullYear();
        m = d.getMonth();
        selected.add(t);
        render();
        refreshConfirm();
      };

      confirm.onclick = () => {
        if (!selected.size) return;
        settled = true;
        const values = [...selected].sort();
        modal.close();
        resolve(values);
      };

      refreshConfirm();
      render();
    };

    modal.onClose = () => {
      if (!settled) resolve(null);
    };
    modal.open();
  });
}

function createPillField(container, text) {
  const b = container.createEl('button', { text:text || uiText('none'), cls:'momo-pill-field' });
  b.type = 'button';
  return b;
}


function guardModalPrimaryTextInput(input, modal) {
  if (!input || !modal) return () => {};

  const root = modal.modalEl;
  let userMovedFocus = false;

  const focusPrimary = (allowParentControl=false) => {
    if (!input.isConnected || input.disabled || !root?.isConnected) return;
    const active = document.activeElement;
    if (active === input) return;

    if (active && active !== document.body && active !== document.documentElement) {
      // A child modal is open above this one: never steal its focus.
      const activeModal = active.closest?.('.modal');
      if (activeModal && activeModal !== root && !root.contains(active)) return;
      // For passive recovery, preserve an intentional focus move inside the
      // parent modal. Explicit restoration may override this after a child closes.
      if (root.contains(active) && !allowParentControl) return;
    }

    try { input.focus({ preventScroll:true }); } catch (_) { input.focus(); }
  };

  // Distinguish Obsidian's own focus pass from a real user choosing another
  // control during the opening animation, so delayed correction never fights
  // a category/date/time click.
  root?.addEventListener('pointerdown', (ev) => {
    if (ev.target !== input) userMovedFocus = true;
  }, true);
  root?.addEventListener('keydown', (ev) => {
    if (ev.key === 'Tab') userMovedFocus = true;
  }, true);

  const initialFocusPass = () => {
    if (!userMovedFocus) focusPrimary(true);
  };
  requestAnimationFrame(initialFocusPass);
  setTimeout(initialFocusPass, 70);
  setTimeout(initialFocusPass, 190);

  // If a global handler drops focus to the background while this modal remains
  // open, recover it. Intentional focus moves inside this/child modals are kept.
  input.addEventListener('focusout', () => setTimeout(() => focusPrimary(false), 0));

  // Returned callback is for explicit restoration after a child modal has fully
  // closed; it may move focus from the parent button back to the empty title.
  return () => focusPrimary(true);
}

function stabilizeTextInput(input) {
  if (!input) return input;
  // 커스텀 모달에서 한글 IME/키 입력이 Obsidian 전역 단축키나
  // 배경 뷰까지 전파되어 재렌더되는 일을 막습니다.
  for (const type of ['keydown','keyup','keypress','input','compositionstart','compositionupdate','compositionend']) {
    input.addEventListener(type, (ev) => ev.stopPropagation());
  }

  // 데스크톱에서 간헐적으로 Obsidian의 전역 pointer/mouse 핸들러가
  // 모달 텍스트 입력의 포커스를 빼앗는 경우가 있다. 입력 시작 계열
  // 이벤트를 모달 안에서 종결하고, 클릭 직후에도 포커스를 한 번 더
  // 보정해 '클릭은 되지만 타이핑이 안 되는' 상태를 복구한다.
  for (const type of ['pointerdown','mousedown']) {
    input.addEventListener(type, (ev) => ev.stopPropagation());
  }
  input.addEventListener('click', (ev) => {
    ev.stopPropagation();
    if (document.activeElement === input) return;
    requestAnimationFrame(() => {
      if (!input.isConnected || input.disabled) return;
      try { input.focus({ preventScroll:true }); } catch (_) { input.focus(); }
    });
  });
  return input;
}

function enableTaskTitleEnterFlow(input, submitButton) {
  if (!input || !submitButton) return;
  input.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter' || ev.isComposing || ev.keyCode === 229) return;
    if (ev.ctrlKey || ev.metaKey) return;
    ev.preventDefault();
    ev.stopPropagation();
    input.blur();
    submitButton.focus();
  });
}

function enableTaskEditorSubmitShortcut(container, submitButton) {
  if (!container || !submitButton) return;
  container.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter' || !(ev.ctrlKey || ev.metaKey) || ev.isComposing || ev.keyCode === 229) return;
    ev.preventDefault();
    ev.stopPropagation();
    submitButton.click();
  }, true);
}

function createDatePicker(app, container, value='') {
  const wrap = container.createDiv({ cls:'momo-date-control' });
  let currentValue = value || '';
  const button = wrap.createEl('button', { cls:'momo-date-button' });
  const refresh = () => button.setText(currentValue || uiText('chooseDate'));
  button.onclick = async (ev) => {
    ev.preventDefault();
    const picked = await openDateChoiceModal(app, currentValue);
    if (picked === null) return;
    currentValue = picked;
    refresh();
  };
  refresh();
  return {
    get value() { return currentValue; },
    set value(v) { currentValue = v || ''; refresh(); },
    button, wrap
  };
}

function createTimeSelect(app, container, value='') {
  const wrap=container.createDiv({cls:'momo-time-pair'}); const [rawH,rawM]=String(value||'').split(':'); let hourValue=/^\d{1,2}$/.test(rawH)?String(Number(rawH)).padStart(2,'0'):''; let minuteValue=/^\d{2}$/.test(rawM)?rawM:''; let periodValue=hourValue?(Number(hourValue)>=12?'pm':'am'):'am';
  const toHour12=()=>hourValue?(Number(hourValue)%12||12):''; const fromHour12=(hour12,period)=>{let h=Number(hour12)%12;if(period==='pm')h+=12;return String(h).padStart(2,'0');};
  let period=null;if(!ACTIVE_USE_24_HOUR)period=createPillField(wrap,uiText(periodValue)); const hour=createPillField(wrap,ACTIVE_USE_24_HOUR?(hourValue||'00'):(toHour12()||'00')); const minute=createPillField(wrap,minuteValue||'00'); if(!ACTIVE_USE_24_HOUR)wrap.addClass('is-12-hour');
  const refresh=()=>{if(period)period.setText(uiText(periodValue));hour.setText(ACTIVE_USE_24_HOUR?(hourValue||'00'):(toHour12()||'00'));minute.setText(minuteValue||'00');};
  if(period)period.onclick=async()=>{const labels=[uiText('am'),uiText('pm')];const picked=await openChoiceModal(app,uiText('choosePeriod'),labels,uiText(periodValue));if(picked===null)return;periodValue=picked===uiText('pm')?'pm':'am';if(hourValue)hourValue=fromHour12(toHour12(),periodValue);refresh();};
  hour.onclick=async()=>{if(ACTIVE_USE_24_HOUR){const choices=Array.from({length:24},(_,i)=>String(i).padStart(2,'0'));const picked=await openChoiceModal(app,uiText('chooseHour'),choices,hourValue||null);if(picked===null)return;hourValue=picked;periodValue=Number(hourValue)>=12?'pm':'am';}else{const choices=Array.from({length:12},(_,i)=>String(i+1));const picked=await openChoiceModal(app,uiText('chooseHour'),choices,toHour12()?String(toHour12()):null);if(picked===null)return;hourValue=fromHour12(Number(picked),periodValue);}if(!minuteValue)minuteValue='00';refresh();};
  minute.onclick=async()=>{const choices=Array.from({length:12},(_,i)=>String(i*5).padStart(2,'0'));const picked=await openChoiceModal(app,uiText('chooseMinute'),choices,minuteValue||null);if(picked===null)return;minuteValue=picked;refresh();};
  return{get value(){if(!hourValue&&!minuteValue)return'';return`${hourValue||'00'}:${minuteValue||'00'}`;},set value(v){const[h,m]=String(v||'').split(':');hourValue=/^\d{1,2}$/.test(h)?String(Number(h)).padStart(2,'0'):'';minuteValue=/^\d{2}$/.test(m)?m:'';periodValue=hourValue&&Number(hourValue)>=12?'pm':'am';refresh();},hour,minute,period,wrap};
}

class MomoTodoMateView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.monthlyReviewOpen = false;
  }
  isMobile() { return window.matchMedia('(max-width: 720px)').matches; }
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return uiText('todoList'); }
  getIcon() { return 'list-checks'; }
  async onOpen() { await this.render(); }

  updateHistoryControls() {
    if (this.undoButton?.isConnected) this.undoButton.disabled = !this.plugin.canUndo();
    if (this.redoButton?.isConnected) this.redoButton.disabled = !this.plugin.canRedo();
  }

  async render() {
    const el = this.contentEl;
    el.empty();
    el.addClass('momoan-todo-view');

    const shell = el.createDiv({ cls:'momo-td-shell' });
    const calendar = shell.createDiv({ cls:'momo-td-calendar-panel' });
    const tasks = shell.createDiv({ cls:'momo-td-task-panel' });

    await this.renderCalendar(calendar);
    await this.renderTaskPanel(tasks, this.plugin.selectedDate);
  }

  async renderCalendar(parent) {
    const date = this.plugin.selectedDate;
    const month = date.slice(0,7);
    const monthMap = await this.plugin.getMonthData(month);
    const [year, monthNum] = month.split('-').map(Number);

    const head = parent.createDiv({ cls:'momo-td-cal-head' });
    const prev = head.createEl('button', { cls:'clickable-icon momo-td-cal-nav', attr:{'aria-label':uiText('prevMonth')} });
    setIcon(prev, 'chevron-left');
    prev.onclick = () => this.plugin.setSelectedDate(shiftMonth(date,-1));

    const monthButton = head.createEl('button', {
      cls:'momo-td-cal-month-btn',
      attr:{'aria-label':uiText('chooseMonth')}
    });
    monthButton.createEl('h2', { text:formatMonthTitle(year, monthNum) });
    monthButton.onclick = () => this.openMonthPicker(date);

    const headActions = head.createDiv({ cls:'momo-td-cal-head-actions' });
    const todayBtn = headActions.createEl('button', {
      text:uiText('today'),
      cls:'momo-td-cal-today',
      attr:{'aria-label':uiText('today')}
    });
    if (date === todaySeoul()) {
      todayBtn.addClass('is-current');
      todayBtn.setAttribute('aria-hidden', 'true');
      todayBtn.tabIndex = -1;
    }
    todayBtn.onclick = () => this.plugin.setSelectedDate(todaySeoul());

    const next = headActions.createEl('button', { cls:'clickable-icon momo-td-cal-nav', attr:{'aria-label':uiText('nextMonth')} });
    setIcon(next, 'chevron-right');
    next.onclick = () => this.plugin.setSelectedDate(shiftMonth(date,1));

    const weekdays = parent.createDiv({ cls:'momo-td-weekdays' });
    const weekdayLabels = activeWeekdayLabels();
    const weekdayIndexes = ACTIVE_WEEK_START === 'sunday' ? [0,1,2,3,4,5,6] : [1,2,3,4,5,6,0];
    for (let i=0; i<weekdayLabels.length; i++) {
      const span = weekdays.createSpan({text:weekdayLabels[i]});
      if (this.plugin.generalSettings?.weekendColorsEnabled !== false) {
        if (weekdayIndexes[i] === 0) span.addClass('is-sunday');
        if (weekdayIndexes[i] === 6) span.addClass('is-saturday');
      }
    }

    const grid = parent.createDiv({ cls:'momo-td-month-grid' });
    const first = new Date(Date.UTC(year, monthNum-1, 1));
    const daysInMonth = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
    const leading = leadingDaysForWeek(first.getUTCDay());
    for (let i=0;i<leading;i++) grid.createDiv({cls:'momo-td-day is-empty'});

    const today = todaySeoul();
    for (let day=1; day<=daysInMonth; day++) {
      const d = `${month}-${String(day).padStart(2,'0')}`;
      const cell = grid.createDiv({ cls:'momo-td-day' });
      if (d === date) cell.addClass('is-selected');
      if (d === today) cell.addClass('is-today');

      const dayOfWeek = new Date(Date.UTC(year, monthNum - 1, day)).getUTCDay();
      const holidayInfo = getCalendarHolidayInfo(d, this.plugin.generalSettings || {});
      const weekendColorsEnabled = this.plugin.generalSettings?.weekendColorsEnabled !== false;
      if (holidayInfo.workdayOverride) cell.addClass('is-workday-override');
      if (holidayInfo.isHoliday) cell.addClass('is-holiday');
      if (weekendColorsEnabled && !holidayInfo.workdayOverride) {
        if (dayOfWeek === 0) cell.addClass('is-sunday');
        if (dayOfWeek === 6) cell.addClass('is-saturday');
      }
      if (holidayInfo.name) {
        cell.setAttribute('title', holidayInfo.name);
        cell.setAttribute('aria-label', `${d} · ${holidayInfo.name}`);
      }
      cell.onclick = () => this.plugin.setSelectedDate(d);

      const items = monthMap.get(d) || [];
      const taskItems = items.filter(x=>x.isTask);
      const previewItems = items.filter(x=>x.preview && !x.skipped && !x.suppressed);
      const remaining = taskItems.filter(x=>!x.done).length;
      const meta = cell.createDiv({cls:'momo-td-day-dots'});
      if (remaining > 0) {
        meta.createSpan({
          text:String(remaining),
          cls:'momo-td-day-count',
          attr:{'aria-label':uiText('remainingAria',{n:remaining})}
        });
      } else if (taskItems.length > 0) {
        const complete = meta.createSpan({
          cls:'momo-td-day-complete',
          attr:{'aria-label':uiText('allDoneAria')}
        });
        setIcon(complete, 'circle-check');
      } else if (previewItems.length > 0) {
        meta.createSpan({
          text:'·',
          cls:'momo-td-day-preview',
          attr:{'aria-label':uiText('previewAria')}
        });
      }
      cell.createSpan({text:String(day), cls:'momo-td-day-number'});
    }

    const monthTasks = [...monthMap.values()].flat().filter(x=>x.isTask);
    const monthDone = monthTasks.filter(x=>x.done).length;
    const monthRate = monthTasks.length ? Math.round(monthDone / monthTasks.length * 100) : 0;
    const showCount = this.plugin.generalSettings?.showMonthCount !== false;
    const showPercent = this.plugin.generalSettings?.showMonthPercent !== false;
    if (showCount || showPercent) {
      const summary = parent.createDiv({cls:'momo-td-month-summary'});
      if (showCount) summary.createDiv({text:`${monthDone}/${monthTasks.length}`, cls:'momo-td-month-summary-number'});
      if (showPercent) summary.createDiv({text:uiText('percentDone',{n:monthRate}), cls:'momo-td-month-summary-caption'});
    }

    if (this.plugin.generalSettings?.monthlyReviewEnabled !== false) {
      const details = parent.createEl('details', { cls:'momo-td-review-disclosure' });
      const toggle = details.createEl('summary', { cls:'momo-td-review-toggle' });
      toggle.createSpan({ text:uiText('monthReview'), cls:'momo-td-review-toggle-label' });
      const toggleIcon = toggle.createSpan({ cls:'momo-td-review-toggle-icon' });
      setIcon(toggleIcon, 'chevron-down');

      let loaded = false;
      const loadReview = async () => {
        if (loaded) return;
        loaded = true;
        const panel = details.createDiv({ cls:'momo-td-review-panel' });
        await this.renderInlineMonthlyReview(panel, month);
      };
      details.open = Boolean(this.monthlyReviewOpen);
      if (details.open) await loadReview();
      details.addEventListener('toggle', async () => {
        this.monthlyReviewOpen = details.open;
        if (details.open) await loadReview();
      });
    }
  }

  async getMonthlyOverview(month) {
    const monthMap = await this.plugin.getMonthData(month);
    const tasks = [...monthMap.values()].flat().filter(x=>x.isTask);
    const done = tasks.filter(x=>x.done);
    const doneByCategory = new Map();
    const doneByGroup = new Map();
    for (const item of done) {
      doneByCategory.set(item.category, (doneByCategory.get(item.category) || 0) + 1);
      const groupKey = `${item.category}::${item.group || '기타'}`;
      doneByGroup.set(groupKey, (doneByGroup.get(groupKey) || 0) + 1);
    }
    const best = getTopCountEntry(doneByCategory);
    const bestGroup = getTopCountEntry(doneByGroup);
    return {
      total:tasks.length,
      done:done.length,
      rate:tasks.length ? Math.round(done.length / tasks.length * 1000) / 10 : 0,
      doneByCategory,
      doneByGroup,
      best,
      bestGroup
    };
  }

  async renderInlineMonthlyReview(parent, month) {
    const { MarkdownRenderer } = require('obsidian');
    const current = await this.getMonthlyOverview(month);
    const previousMonth = shiftMonth(`${month}-01`, -1).slice(0,7);
    const previous = await this.getMonthlyOverview(previousMonth);
    const shift = summarizeCategoryShift(current.doneByCategory, previous.doneByCategory);
    const currentBestGroupParts = current.bestGroup ? String(current.bestGroup[0]).split('::') : [];
    const bestGroupCategory = currentBestGroupParts[0] || null;
    const bestGroupName = currentBestGroupParts[1] || null;

    const file = await this.plugin.openMonthlyReview(month, false);
    const fileText = await this.plugin.app.vault.read(file);
    const journalText = sanitizeMonthlyReviewJournal(extractMonthlyReviewJournal(fileText));

    const tools = parent.createDiv({ cls:'momo-td-review-tools' });
    const openBtn = tools.createEl('button', { cls:'momo-td-review-open' });
    const openIcon = openBtn.createSpan({ cls:'momo-td-review-tool-icon' });
    setIcon(openIcon, 'pencil');
    openBtn.createSpan({ text:uiText('reviewWrite') });
    openBtn.onclick = async () => this.plugin.app.workspace.getLeaf(true).openFile(file);
    const imageBtn = tools.createEl('button', { cls:'momo-td-review-open momo-td-review-image-save' });
    const imageIcon = imageBtn.createSpan({ cls:'momo-td-review-tool-icon' });
    setIcon(imageIcon, 'image');
    imageBtn.createSpan({ text:uiText('imageSave') });
    imageBtn.onclick = async () => this.saveMonthlyReviewImage(month);

    const summary = parent.createDiv({ cls:'momo-td-review-summary' });
    const addSummaryRow = (label, value, sub='', icon='circle') => {
      const row = summary.createDiv({ cls:'momo-td-review-summary-row' });
      const labelWrap = row.createSpan({ cls:'momo-td-review-summary-label' });
      const labelIcon = labelWrap.createSpan({ cls:'momo-td-review-summary-icon' });
      setIcon(labelIcon, icon);
      labelWrap.createSpan({ text:label });
      const right = row.createDiv({ cls:'momo-td-review-summary-right' });
      right.createSpan({ text:value, cls:'momo-td-review-summary-value' });
      if (sub) right.createSpan({ text:sub, cls:'momo-td-review-summary-sub' });
    };
    addSummaryRow(uiText('lastMonthChange'), shift.value, '', 'trending-up');
    addSummaryRow(
      uiText('focusCategory'),
      current.best ? `${current.best[0]} · ${current.best[1]}` : '-',
      '',
      'folder'
    );
    addSummaryRow(
      uiText('focusGroup'),
      bestGroupName
        ? `${bestGroupName === '기타' ? `${bestGroupCategory} · 기타` : bestGroupName} · ${current.bestGroup[1]}`
        : '-',
      '',
      'layers-3'
    );

    const categorySection = parent.createDiv({ cls:'momo-td-review-section' });
    categorySection.createDiv({ text:uiText('categoryRecord'), cls:'momo-td-review-section-title' });
    const categoryList = categorySection.createDiv({ cls:'momo-td-review-category-list' });
    const entries = [...new Set([...CATEGORIES, ...current.doneByCategory.keys()])]
      .filter(c => current.doneByCategory.get(c));
    if (!entries.length) {
      categoryList.createDiv({ text:'-', cls:'momo-td-review-empty' });
    } else {
      for (const category of entries) {
        const row = categoryList.createDiv({ cls:'momo-td-review-category-row' });
        const label = row.createDiv({ cls:'momo-td-review-category-label' });
        label.createSpan({ cls:'momo-td-review-category-dot' });
        label.createSpan({ text:category, cls:'momo-td-review-category-name' });
        row.createSpan({ text:String(current.doneByCategory.get(category)), cls:'momo-td-review-category-count' });
      }
    }

    const journalSection = parent.createDiv({ cls:'momo-td-review-section momo-td-review-journal-section' });
    journalSection.createDiv({ text:uiText('reviewJournal'), cls:'momo-td-review-section-title' });
    const journal = journalSection.createDiv({ cls:'momo-td-review-journal markdown-rendered' });
    if (!journalText || journalText.trim() === '-') {
      journal.createDiv({ text:uiText('noReview'), cls:'momo-td-review-empty' });
    } else {
      await MarkdownRenderer.render(this.app, journalText, journal, file.path, this);
    }
  }

  async saveMonthlyReviewImage(month) {
    const panel = this.contentEl.querySelector('.momo-td-calendar-panel');
    if (!panel) {
      new Notice(uiText('monthReviewNotFound'));
      return;
    }

    const saveButton = panel.querySelector('.momo-td-review-image-save');
    if (saveButton) saveButton.disabled = true;

    try {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const blob = await this.captureElementAsPng(panel, '.momo-td-review-image-save');
      const filename = `${month} 월간 회고.png`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      new Notice(`월간 회고 이미지 다운로드를 시작했습니다.
${filename}`);
    } catch (error) {
      console.error('월간 회고 이미지 저장:', error);
      new Notice(uiText('monthReviewImageFailed'));
    } finally {
      if (saveButton) saveButton.disabled = false;
    }
  }

  getTightElementCaptureSize(element, removeSelector='') {
    const rect = element.getBoundingClientRect();
    const computed = getComputedStyle(element);
    const padTop = parseFloat(computed.paddingTop || '0') || 0;
    let maxBottom = padTop;

    // 루트 패널 자체의 높이(min-height/viewport stretch)는 캡처 높이에 포함하지 않는다.
    // 실제 레이아웃을 구성하는 직계 자식의 끝 지점만 기준으로 잡아 모바일의 긴 빈 여백을 제거한다.
    for (const node of [...element.children]) {
      if (!(node instanceof HTMLElement)) continue;
      if (removeSelector && node.matches(removeSelector)) continue;
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const nodeRect = node.getBoundingClientRect();
      if (!nodeRect.width && !nodeRect.height) continue;
      maxBottom = Math.max(maxBottom, nodeRect.bottom - rect.top);
    }

    const captureBottomPadding = 18;
    const width = Math.max(1, Math.ceil(rect.width));
    const height = Math.max(1, Math.ceil(maxBottom + captureBottomPadding));
    return { width, height, captureBottomPadding };
  }

  async captureElementAsPng(element, removeSelector='') {
    const { width, height, captureBottomPadding } = this.getTightElementCaptureSize(element, removeSelector);
    const clone = element.cloneNode(true);
    const originals = [element, ...element.querySelectorAll('*')];
    const clones = [clone, ...clone.querySelectorAll('*')];

    for (let i = 0; i < Math.min(originals.length, clones.length); i++) {
      const source = originals[i];
      const target = clones[i];
      const computed = getComputedStyle(source);
      let cssText = '';
      for (let j = 0; j < computed.length; j++) {
        const property = computed[j];
        const value = computed.getPropertyValue(property);
        if (!value) continue;
        cssText += `${property}:${value};`;
      }
      target.setAttribute('style', cssText);
    }

    if (removeSelector) clone.querySelectorAll(removeSelector).forEach(node => node.remove());
    clone.querySelectorAll('[disabled]').forEach(node => node.removeAttribute('disabled'));

    let background = getComputedStyle(element).backgroundColor;
    if (!background || background === 'rgba(0, 0, 0, 0)' || background === 'transparent') {
      background = getComputedStyle(this.contentEl).backgroundColor;
    }
    if (!background || background === 'rgba(0, 0, 0, 0)' || background === 'transparent') background = '#ffffff';

    clone.style.width = `${width}px`;
    clone.style.height = `${height}px`;
    clone.style.minHeight = '0';
    clone.style.maxWidth = 'none';
    clone.style.maxHeight = 'none';
    clone.style.paddingBottom = `${captureBottomPadding}px`;
    clone.style.overflow = 'hidden';
    clone.style.background = background;
    clone.style.boxSizing = 'border-box';

    const serialized = new XMLSerializer().serializeToString(clone);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;background:${background};overflow:hidden;">${serialized}</div></foreignObject></svg>`;
    // Obsidian/Electron 환경에서는 blob: 이미지가 CSP에 막힐 수 있어 data URL을 사용합니다.
    const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('SVG 이미지를 불러오지 못했습니다.'));
      img.src = svgDataUrl;
    });

    const scale = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const captureTopPadding = 20;
    const outputHeight = height + captureTopPadding;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(outputHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 컨텍스트를 만들지 못했습니다.');
    ctx.scale(scale, scale);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, outputHeight);
    ctx.drawImage(image, 0, captureTopPadding, width, height);
    return await new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG 생성에 실패했습니다.')), 'image/png', 1);
    });
  }

  openMonthPicker(currentDate) {
    const { Modal } = require('obsidian');
    const modal = enableModalMotion(new Modal(this.app));
    modal.onOpen = () => {
      const { contentEl } = modal;
      contentEl.empty();
      contentEl.addClass('momo-month-picker-modal');
      const [currentYear, currentMonth, currentDay] = currentDate.split('-').map(Number);
      let year = currentYear;
      let month = currentMonth;

      const head = contentEl.createDiv({ cls:'momo-month-picker-head' });
      head.createEl('h3', { text:uiText('chooseMonth') });
      const yearControl = head.createDiv({ cls:'momo-month-picker-year-control' });
      const prevYear = yearControl.createEl('button', { cls:'clickable-icon', attr:{'aria-label':uiText('prevYear')} });
      setIcon(prevYear, 'chevron-left');
      const yearLabel = yearControl.createEl('button', { cls:'momo-month-picker-year-label' });
      const nextYear = yearControl.createEl('button', { cls:'clickable-icon', attr:{'aria-label':uiText('nextYear')} });
      setIcon(nextYear, 'chevron-right');

      const grid = contentEl.createDiv({ cls:'momo-month-picker-grid' });
      const renderMonths = () => {
        yearLabel.setText(ACTIVE_LANGUAGE === 'ko' ? `${year}년` : ACTIVE_LANGUAGE === 'ja' || ACTIVE_LANGUAGE === 'zh' ? `${year}年` : String(year));
        grid.empty();
        for (let m=1; m<=12; m++) {
          const button = grid.createEl('button', { text:ACTIVE_LANGUAGE === 'ko' ? `${m}월` : ACTIVE_LANGUAGE === 'ja' || ACTIVE_LANGUAGE === 'zh' ? `${m}月` : new Intl.DateTimeFormat('en-US',{month:'short',timeZone:'UTC'}).format(new Date(Date.UTC(2020,m-1,1))), cls:'momo-month-picker-month' });
          if (year === currentYear && m === currentMonth) button.addClass('is-current');
          if (m === month) button.addClass('is-selected');
          button.onclick = () => {
            month = m;
            renderMonths();
          };
        }
      };
      prevYear.onclick = () => { year -= 1; renderMonths(); };
      nextYear.onclick = () => { year += 1; renderMonths(); };
      yearLabel.onclick = () => {
        const nowYear = Number(todaySeoul().slice(0,4));
        year = nowYear;
        renderMonths();
      };
      renderMonths();

      const actions = contentEl.createDiv({ cls:'momo-month-picker-actions' });
      const cancel = actions.createEl('button', { text:uiText('cancel') });
      cancel.onclick = () => modal.close();
      const move = actions.createEl('button', { text:uiText('go'), cls:'mod-cta' });
      move.onclick = () => {
        const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
        const day = Math.min(currentDay, maxDay);
        modal.close();
        this.plugin.setSelectedDate(`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`);
      };
    };
    modal.open();
  }

  async renderTaskPanel(parent,date) {
    let items = await this.plugin.getItemsForDate(date);
    const rescuedLegacy = await this.plugin.recoverLegacyRuntimeFromItems(items);
    if (rescuedLegacy) items = await this.plugin.getItemsForDate(date);
    const displayBaseItems = items;
    const remaining = displayBaseItems.filter(x=>x.isTask && !x.done).length;
    const completed = displayBaseItems.filter(x=>x.isTask && x.done).length;

    const head = parent.createDiv({cls:'momo-td-task-head'});
    const titleWrap = head.createDiv({cls:'momo-td-title-wrap'});
    titleWrap.createEl('h2',{text:formatKoreanDate(date)});
    titleWrap.createDiv({
      text: remaining === 0 ? uiText('noRemaining') : uiText('remaining',{n:remaining}),
      cls:'momo-td-task-kicker'
    });
    const viewToggles = titleWrap.createDiv({cls:'momo-td-view-toggles'});
    const completedToggle = viewToggles.createEl('button', {
      cls:'momo-td-view-toggle momo-td-completed-toggle',
      attr:{
        'aria-label':uiText('toggleCompletedAria'),
        'aria-pressed': this.plugin.hideCompleted ? 'false' : 'true'
      }
    });
    completedToggle.createSpan({ text:uiText('completed'), cls:'momo-td-toggle-label' });
    completedToggle.createSpan({ cls:'momo-td-mini-switch', attr:{'aria-hidden':'true'} });
    if (!this.plugin.hideCompleted) completedToggle.addClass('is-on');
    completedToggle.onclick = () => this.plugin.setHideCompleted(!this.plugin.hideCompleted);

    const categoryToggle = viewToggles.createEl('button', {
      cls:'momo-td-view-toggle momo-td-category-toggle',
      attr:{
        'aria-label':uiText('toggleClassificationAria'),
        'aria-pressed': this.plugin.showAllCategories ? 'true' : 'false'
      }
    });
    categoryToggle.createSpan({ text:uiText('classification'), cls:'momo-td-toggle-label' });
    categoryToggle.createSpan({ cls:'momo-td-mini-switch', attr:{'aria-hidden':'true'} });
    if (this.plugin.showAllCategories) categoryToggle.addClass('is-on');
    categoryToggle.onclick = () => this.plugin.setShowAllCategories(!this.plugin.showAllCategories);

    const headActions = head.createDiv({ cls:'momo-td-main-actions' });

    const add = headActions.createEl('button',{cls:'momo-td-main-add', attr:{'aria-label':uiText('addTask')}});
    setIcon(add, 'plus');
    add.onclick = () => this.plugin.runQuickAdd(date);

    const autoSort = headActions.createEl('button', {
      cls:'momo-td-main-sort',
      attr:{'aria-label':uiText('autoSort'), 'title':uiText('autoSortHintConfigured')}
    });
    setIcon(autoSort, 'arrow-down-wide-narrow');
    autoSort.onclick = async () => {
      if (autoSort.disabled) return;
      autoSort.disabled = true;
      try {
        const outcome = await this.plugin.runUndoableAction('task-sort', () =>
          autoSortTasksForDate(this.app, date, this.plugin.generalSettings)
        );
        if (outcome?.changed) {
          const path = `${DATA_FOLDER}/${date.slice(0,7)}.md`;
          this.plugin.invalidateFile(path);
          const scrollTop = this.contentEl.scrollTop;
          await this.render();
          this.contentEl.scrollTop = scrollTop;
          requestAnimationFrame(() => { this.contentEl.scrollTop = scrollTop; });
          new Notice(uiText('autoSorted'));
        } else {
          new Notice(uiText('autoSortNoChange'));
        }
      } finally {
        autoSort.disabled = false;
      }
    };

    const routines = headActions.createEl('button', {
      cls:'momo-td-main-routines',
      attr:{'aria-label':uiText('routineManager')}
    });
    setIcon(routines, 'repeat-2');
    routines.onclick = () => this.plugin.openRoutineManager();

    const settings = headActions.createEl('button', {
      cls:'momo-td-main-settings',
      attr:{'aria-label':uiText('classificationSettings')}
    });
    setIcon(settings, 'menu');
    settings.onclick = () => this.plugin.openTodoSettings('categories');

    const headMeta = head.createDiv({ cls:'momo-td-head-meta' });
    const historyActions = headMeta.createDiv({ cls:'momo-td-history-actions' });
    const undo = historyActions.createEl('button', {
      cls:'momo-td-history-button momo-td-undo',
      attr:{'aria-label':uiText('undoAction'), 'title':uiText('undoHint')}
    });
    setIcon(undo, 'undo-2');
    undo.onclick = async () => { if (!undo.disabled) await this.plugin.undoLastChange(); };
    const redo = historyActions.createEl('button', {
      cls:'momo-td-history-button momo-td-redo',
      attr:{'aria-label':uiText('redoAction'), 'title':uiText('redoHint')}
    });
    setIcon(redo, 'redo-2');
    redo.onclick = async () => { if (!redo.disabled) await this.plugin.redoLastChange(); };
    this.undoButton = undo;
    this.redoButton = redo;

    const headProgress = headMeta.createDiv({ cls:'momo-td-head-progress' });
    headProgress.createSpan({ text:String(completed), cls:'momo-td-head-progress-done' });
    headProgress.createSpan({ text:'/' });
    headProgress.createSpan({ text:String(completed + remaining) });
    this.updateHistoryControls();

    const body = parent.createDiv({cls:'momo-td-body'});
    if (!displayBaseItems.length && !this.plugin.showAllCategories) {
      const empty=body.createDiv({cls:'momo-td-empty'});
      const icon=empty.createDiv({cls:'momo-td-empty-icon'});
      setIcon(icon,'circle-check-big');
      empty.createDiv({text:uiText('emptyToday'), cls:'momo-td-empty-title'});
      empty.createDiv({text:uiText('emptyTodaySub'), cls:'momo-td-empty-sub'});
      const b=empty.createEl('button',{text:`＋ ${uiText('addTask')}`});
      b.onclick=()=>this.plugin.runQuickAdd(date);
      return;
    }

    const visibleItems = this.plugin.hideCompleted
      ? displayBaseItems.filter(x => !x.done && !x.suppressed)
      : displayBaseItems;
    if (!visibleItems.length && displayBaseItems.length && !this.plugin.showAllCategories) {
      const hidden = body.createDiv({cls:'momo-td-empty'});
      const icon=hidden.createDiv({cls:'momo-td-empty-icon'});
      setIcon(icon,'sparkles');
      const hiddenSuppressed = displayBaseItems.filter(x => x.suppressed).length;
      hidden.createDiv({text:uiText('hiddenTasks'), cls:'momo-td-empty-title'});
      const hiddenParts = [];
      if (completed > 0) hiddenParts.push(`완료 ${completed}개`);
      if (hiddenSuppressed > 0) hiddenParts.push(`이동·삭제된 루틴 ${hiddenSuppressed}개`);
      hidden.createDiv({
        text: hiddenParts.length ? `${hiddenParts.join(' · ')}를 숨기고 있습니다.` : '숨김 항목이 있습니다.',
        cls:'momo-td-empty-sub'
      });
      const show = hidden.createEl('button',{text:uiText('showCompleted')});
      show.onclick = () => this.plugin.setHideCompleted(false);
      return;
    }
    const byCat = groupBy(visibleItems, x=>x.category);
    const renderCategories = [...new Set([...CATEGORIES, ...byCat.keys()])];
    for (const category of renderCategories) {
      const catItems = byCat.get(category) || [];
      const inactiveCategory = CATEGORIES.includes(category) && this.plugin.inactiveCategories?.has(category);
      if (!catItems.length && (!this.plugin.showAllCategories || inactiveCategory)) continue;
      const section=body.createDiv({cls:'momo-td-category'});
      section.style.setProperty('--cat', COLORS[category] || COLORS['기타']);

      const taskItems=catItems.filter(x=>x.isTask);
      const done=taskItems.filter(x=>x.done).length;
      const catHead=section.createDiv({cls:'momo-td-cat-head'});
      const label=catHead.createDiv({cls:'momo-td-cat-name'});
      label.createSpan({cls:'momo-td-dot'});
      label.createSpan({text:category});
      const right=catHead.createDiv({cls:'momo-td-cat-actions'});
      right.createSpan({text:`${done}/${taskItems.length}`,cls:'momo-td-count'});
      const plus=right.createEl('button',{text:'＋',attr:{'aria-label':uiText('addTaskFor',{name:category})}});
      plus.onclick=()=>this.plugin.runQuickAdd(date,category);

      const byGroup=groupBy(catItems,x=>x.group || '기타');
      const configuredGroups = (GROUP_PRESETS[category] || ['기타'])
        .filter(group => !(this.plugin.inactiveGroups?.[category]?.has(group)));
      const groups = this.plugin.showAllCategories
        ? [...new Set([...configuredGroups, ...byGroup.keys()])]
        : [...byGroup.keys()].sort((a,b)=>groupRank(category,a)-groupRank(category,b) || a.localeCompare(b,'ko'));

      for (const group of groups) {
        const list=(byGroup.get(group) || []).slice().sort(itemSorter);
        const groupEl=section.createDiv({cls:'momo-td-group'});
        const groupHead = groupEl.createDiv({cls:'momo-td-group-head'});
        groupHead.createSpan({text:group,cls:'momo-td-group-title'});

        // Existing groups always keep a direct add action, regardless of the
        // classification-display toggle. Empty configured groups still only
        // render while classification display is enabled.
        const groupPlus = groupHead.createEl('button', {
          cls:'momo-td-group-add',
          attr:{'aria-label':uiText('addTaskForGroup',{category,group}), 'title':uiText('addTaskForGroup',{category,group})}
        });
        setIcon(groupPlus, 'plus');
        groupPlus.onclick = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          this.plugin.runQuickAdd(date, category, group);
        };
        for (const item of list) this.renderItem(groupEl,item);
      }
    }
  }

  renderItem(parent,item) {
    const row=parent.createDiv({cls:'momo-td-item'});
    row.__momoTaskItem = item;
    if (item.done) row.addClass('is-done');
    if (item.suppressed) row.addClass('is-suppressed');
    if (item.preview) row.addClass('is-preview');
    if (item.skipped) row.addClass('is-skipped');
    if (!item.suppressed && !item.preview && !item.skipped) this.enableTaskLongPressReorder(row, item);
    if (!item.suppressed && !item.preview && !item.skipped) {
      const cb=row.createEl('button', {
        cls:'momo-task-check',
        attr:{
          'aria-label': item.done ? uiText('undoComplete') : uiText('completed'),
          'aria-pressed': item.done ? 'true' : 'false'
        }
      });
      if (item.done) {
        cb.addClass('is-checked');
        cb.setText('✓');
      }
      cb.onclick=async(ev)=>{
        ev.preventDefault();
        ev.stopPropagation();
        const scrollTop = this.contentEl.scrollTop;
        await this.plugin.runUndoableAction('task-complete', () =>
          toggleTask(this.app,item,!item.done)
        );
        this.plugin.invalidateFile(item.filePath);
        await this.render();
        this.contentEl.scrollTop = scrollTop;
        requestAnimationFrame(() => { this.contentEl.scrollTop = scrollTop; });
      };
    } else if (item.preview) {
      row.createSpan({text:'·',cls:'momo-td-preview-mark',attr:{'aria-label':uiText('previewRoutine')}});
    } else if (item.skipped) {
      row.createSpan({text:'–',cls:'momo-td-preview-mark',attr:{'aria-label':uiText('skippedOccurrence')}});
    } else {
      row.createSpan({text:'○',cls:'momo-td-suppressed-mark',attr:{'aria-label':uiText('canRestore')}});
    }
    if (item.time) row.createSpan({text:this.plugin.formatTimeForDisplay(item.time),cls:'momo-td-time'});
    const title = row.createSpan({text:item.title,cls:'momo-td-item-title'});
    if (item.preview && item.routineId) {
      title.addClass('is-actionable');
      title.onclick = (ev) => { ev.stopPropagation(); this.openPreviewActions(item); };
      const more = row.createEl('button', {
        text:'⋯',
        cls:'momo-td-item-more',
        attr:{'aria-label':uiText('previewMenuFor',{name:item.title})}
      });
      more.onclick = (ev) => { ev.stopPropagation(); this.openPreviewActions(item); };
    } else if (item.suppressed && item.routineId) {
      row.addClass('is-restorable');
      row.setAttr('title',uiText('restoreHint'));
      row.onclick = async () => {
        const restored = await this.plugin.runUndoableAction('occurrence-restore', () =>
          restoreSuppressedRoutineInstance(this.app, item)
        );
        if (!restored) {
          new Notice(uiText('duplicateRoutineDate'));
          return;
        }
        this.plugin.invalidateFile(item.filePath);
        await this.render();
        new Notice(uiText('restoredTask',{name:item.title}));
      };

      const more = row.createEl('button', {
        text:'⋯',
        cls:'momo-td-item-more',
        attr:{'aria-label':uiText('ghostMenuFor',{name:item.title})}
      });
      more.onclick = async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const ok = window.confirm(uiText('removeGhostConfirm',{name:item.title}));
        if (!ok) return;
        await this.plugin.runUndoableAction('occurrence-hard-delete', () =>
          hardDeleteTaskInstance(this.app, item)
        );
        this.plugin.invalidateFile(item.filePath);
        await this.render();
        new Notice(uiText('removedGhost',{name:item.title}));
      };
    } else {
      title.addClass('is-actionable');
      title.onclick = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        // Pointer capture for long-press reorder can retarget the browser's
        // synthetic click to the row. When pointerup already handled this tap,
        // ignore the follow-up click so single/double-tap is counted exactly once.
        if (row.__momoPointerTapHandledUntil && Date.now() < row.__momoPointerTapHandledUntil) return;
        this.handleTaskTitleTap(row, item);
      };
      if (item.location) row.createSpan({text:item.location,cls:'momo-td-location'});
      const more = row.createEl('button', {
        text:'⋯',
        cls:'momo-td-item-more',
        attr:{'aria-label':uiText('menuFor',{name:item.title})}
      });
      more.onclick = (ev) => { ev.stopPropagation(); this.openItemActions(item); };
    }
  }


  handleTaskTitleTap(row, item) {
    if (row.__momoSuppressClickUntil && Date.now() < row.__momoSuppressClickUntil) return;

    const now = Date.now();
    const DOUBLE_TAP_MS = 285;

    if (row.__momoTitleTapTimer && now - (row.__momoLastTitleTap || 0) <= DOUBLE_TAP_MS) {
      window.clearTimeout(row.__momoTitleTapTimer);
      row.__momoTitleTapTimer = null;
      row.__momoLastTitleTap = 0;
      this.openTaskTitleEditor(item);
      return;
    }

    row.__momoLastTitleTap = now;
    row.__momoTitleTapTimer = window.setTimeout(() => {
      row.__momoTitleTapTimer = null;
      row.__momoLastTitleTap = 0;
      if (row.__momoSuppressClickUntil && Date.now() < row.__momoSuppressClickUntil) return;
      this.openItemActions(item);
    }, DOUBLE_TAP_MS);
  }

  async openTaskTitleEditor(item) {
    // Double-click keeps the full task/occurrence editor available, but makes
    // title editing immediate by focusing and selecting the current name.
    // This avoids a separate rename-only modal while preserving access to the
    // rest of the fields when the user needs them.
    return this.openTaskEditor(item, { selectTitle:true });
  }

  enableTaskLongPressReorder(row, item) {
    row.dataset.momoReorderable = '1';

    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let lastY = 0;
    let holdTimer = null;
    let active = false;
    let targetRow = null;
    let placeAfter = false;
    let cancelled = false;
    let startedOnTitle = false;
    let ghost = null;
    let ghostBaseTop = 0;

    const parent = row.parentElement;
    const HOLD_MS = 340;
    const PREHOLD_MOVE_TOLERANCE = 9;

    const clearTarget = () => {
      if (targetRow) {
        targetRow.removeClass('is-drop-before');
        targetRow.removeClass('is-drop-after');
      }
      targetRow = null;
    };

    const cleanup = () => {
      if (holdTimer) {
        window.clearTimeout(holdTimer);
        holdTimer = null;
      }
      clearTarget();
      if (ghost) {
        try { ghost.remove(); } catch (_) {}
        ghost = null;
      }
      row.removeClass('is-reordering');
      row.removeClass('is-drag-source');
      row.style.touchAction = '';
      document.body.classList.remove('momo-task-reorder-active');
      const capturedPointerId = pointerId;
      pointerId = null;
      active = false;
      cancelled = false;
      startedOnTitle = false;
      if (capturedPointerId !== null) {
        try {
          if (row.hasPointerCapture?.(capturedPointerId)) row.releasePointerCapture(capturedPointerId);
        } catch (_) {}
      }
    };

    const peerRows = () => Array.from(parent?.children || []).filter(el =>
      el !== row &&
      el.classList?.contains('momo-td-item') &&
      el.dataset?.momoReorderable === '1' &&
      !el.classList.contains('is-suppressed')
    );

    const updateTarget = (clientY) => {
      const peers = peerRows();
      if (!peers.length) {
        clearTarget();
        return;
      }

      let best = null;
      let bestDist = Infinity;
      for (const peer of peers) {
        const rect = peer.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const dist = Math.abs(clientY - center);
        if (dist < bestDist) {
          best = peer;
          bestDist = dist;
        }
      }

      if (!best) return;
      const rect = best.getBoundingClientRect();
      const nextAfter = clientY >= rect.top + rect.height / 2;

      if (targetRow !== best || placeAfter !== nextAfter) {
        clearTarget();
        targetRow = best;
        placeAfter = nextAfter;
        targetRow.addClass(placeAfter ? 'is-drop-after' : 'is-drop-before');
      }
    };

    const activate = (ev) => {
      if (cancelled || pointerId === null) return;
      active = true;
      row.__momoSuppressClickUntil = Date.now() + 700;
      row.addClass('is-reordering');
      row.addClass('is-drag-source');
      row.style.touchAction = 'none';

      const rect = row.getBoundingClientRect();
      ghostBaseTop = rect.top;
      ghost = row.cloneNode(true);
      ghost.classList.remove('is-reordering', 'is-drag-source', 'is-drop-before', 'is-drop-after');
      ghost.classList.add('momo-task-drag-ghost');
      ghost.removeAttribute('data-momo-reorderable');
      ghost.style.left = `${rect.left}px`;
      ghost.style.top = `${rect.top}px`;
      ghost.style.width = `${rect.width}px`;
      ghost.style.height = `${rect.height}px`;
      ghost.style.transform = 'translate3d(0,0,0)';
      document.body.appendChild(ghost);

      document.body.classList.add('momo-task-reorder-active');
      try { navigator.vibrate?.(8); } catch (_) {}
      updateTarget(lastY || startY);
    };

    row.addEventListener('pointerdown', (ev) => {
      if (ev.button !== undefined && ev.button !== 0) return;
      if (ev.target?.closest?.('button, input, select, textarea, a, .momo-td-item-more')) return;
      if (!parent) return;

      pointerId = ev.pointerId;
      startedOnTitle = Boolean(ev.target?.closest?.('.momo-td-item-title'));
      try { row.setPointerCapture(pointerId); } catch (_) {}
      startX = ev.clientX;
      startY = ev.clientY;
      lastY = ev.clientY;
      cancelled = false;
      active = false;

      holdTimer = window.setTimeout(() => activate(ev), HOLD_MS);
    });

    row.addEventListener('pointermove', (ev) => {
      if (pointerId === null || ev.pointerId !== pointerId) return;
      lastY = ev.clientY;

      if (!active) {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (Math.hypot(dx, dy) > PREHOLD_MOVE_TOLERANCE) {
          cancelled = true;
          if (holdTimer) {
            window.clearTimeout(holdTimer);
            holdTimer = null;
          }
        }
        return;
      }

      ev.preventDefault();
      ev.stopPropagation();

      if (ghost) {
        const dy = ev.clientY - startY;
        ghost.style.transform = `translate3d(0, ${dy}px, 0)`;
      }

      updateTarget(ev.clientY);

      // 모바일/데스크톱 모두 투두 뷰 자체를 가장자리에서 자동 스크롤합니다.
      const edge = 72;
      const viewportH = window.innerHeight || document.documentElement.clientHeight;
      if (ev.clientY < edge) this.contentEl.scrollTop -= 18;
      else if (ev.clientY > viewportH - edge) this.contentEl.scrollTop += 18;
    }, { passive:false });

    const finish = async (ev) => {
      if (pointerId === null || ev.pointerId !== pointerId) return;

      if (holdTimer) {
        window.clearTimeout(holdTimer);
        holdTimer = null;
      }

      if (!active) {
        const shouldHandleTitleTap = startedOnTitle && !cancelled;
        cleanup();
        if (shouldHandleTitleTap) {
          // setPointerCapture() starts at pointerdown so reorder cleanup stays
          // reliable, but that capture may prevent the title span's native click
          // from firing. Count the tap here instead, then suppress any duplicate
          // synthetic click the browser still emits.
          row.__momoPointerTapHandledUntil = Date.now() + 450;
          this.handleTaskTitleTap(row, item);
        }
        return;
      }

      ev.preventDefault();
      ev.stopPropagation();

      const dropTarget = targetRow?.__momoTaskItem || null;
      const after = placeAfter;
      row.__momoSuppressClickUntil = Date.now() + 700;

      cleanup();

      if (!dropTarget) return;
      if (dropTarget.filePath !== item.filePath ||
          dropTarget.date !== item.date ||
          dropTarget.category !== item.category ||
          normalizeTaskGroup(dropTarget.group) !== normalizeTaskGroup(item.group)) {
        return;
      }

      const moved = await this.plugin.runUndoableAction('task-reorder', () =>
        moveTaskNearTask(this.app, item, dropTarget, after)
      );
      if (!moved) return;

      this.plugin.invalidateFile(item.filePath);
      const scrollTop = this.contentEl.scrollTop;
      await this.render();
      this.contentEl.scrollTop = scrollTop;
      requestAnimationFrame(() => { this.contentEl.scrollTop = scrollTop; });
    };

    row.addEventListener('pointerup', finish, { passive:false });
    row.addEventListener('pointercancel', () => cleanup());
    row.addEventListener('lostpointercapture', () => {
      if (pointerId !== null) cleanup();
    });
  }

  async openPreviewActions(item) {
    const { Modal } = require('obsidian');
    const modal = enableModalMotion(new Modal(this.app));
    modal.onOpen = () => {
      const { contentEl } = modal;
      contentEl.empty();
      contentEl.addClass('momo-task-actions-modal');
      contentEl.createEl('h2', { text:item.title });

      const actions = contentEl.createDiv({ cls:'momo-task-actions-list' });
      const addAction = (label, handler, danger=false) => {
        const b = actions.createEl('button', { text:label });
        if (danger) b.addClass('momo-task-action-danger');
        b.onclick = async () => {
          modal.close();
          await handler();
        };
      };

      addAction(uiText('moveToday'), async () => {
        const targetDate = todaySeoul();
        const targetPath = `${DATA_FOLDER}/${targetDate.slice(0,7)}.md`;
        let sourceChanged = false;
        await this.plugin.runUndoableAction('preview-move', async () => {
          await mutateTextFile(this.app, item.filePath, text => {
            const lines = text.split('\n');
            let idx = item.lineIndex;
            if (idx < 0 || lines[idx] !== item.raw) idx = lines.indexOf(item.raw);
            if (idx < 0) return text;
            lines[idx] = buildTaskLine(item, {
              preview:false,
              skipped:false,
              suppressed:true,
              suppressedReason:'moved',
              occurrenceOverride:true,
              done:false
            });
            sourceChanged = true;
            return lines.join('\n');
          });
          if (!sourceChanged) return;

          const occurrenceDate = item.occurrenceDate || item.date;
          const movedLine = buildTaskLine(item, {
            date:targetDate,
            occurrenceDate,
            preview:false,
            skipped:false,
            suppressed:false,
            suppressedReason:null,
            movedFrom:occurrenceDate,
            occurrenceOverride:true,
            done:false
          });
          await insertTaskUnderDate(this.app, targetPath, targetDate, movedLine, {
            routineId:item.routineId,
            occurrenceDate
          });
          await this.plugin.runRoutineIntegritySelfCheck(await this.plugin.loadRoutines());
        });
        if (!sourceChanged) return;

        this.plugin.invalidateFile(item.filePath);
        this.plugin.invalidateFile(targetPath);
        // 날짜 이동 뒤에도 사용자가 보고 있던 원래 날짜에 머문다.
        await this.render();
        new Notice(uiText('movedToday',{name:item.title}));
      });

      addAction(uiText('skipOccurrence'), async () => {
        await this.plugin.runUndoableAction('occurrence-skip', async () => {
          await mutateTextFile(this.app, item.filePath, text => {
            const lines = text.split('\n');
            let idx = item.lineIndex;
            if (idx < 0 || lines[idx] !== item.raw) idx = lines.indexOf(item.raw);
            if (idx < 0) return text;
            lines[idx] = buildTaskLine(item, {
              preview:false,
              skipped:true,
              suppressed:false,
              occurrenceOverride:true,
              done:false
            });
            return lines.join('\n');
          });
        });
        this.plugin.invalidateFile(item.filePath);
        await this.render();
        new Notice(uiText('skippedTask',{name:item.title}));
      });

      addAction(uiText('routineEdit'), async () => {
        const routines = await this.plugin.loadRoutines();
        const routine = routines.find(r => r.id === item.routineId);
        if (!routine) {
          new Notice(uiText('noRoutineSource'));
          return;
        }
        await this.plugin.openRoutineEditor(routine);
      });
    };
    modal.open();
  }

  async openItemActions(item) {
    const { Modal } = require('obsidian');
    const modal = enableModalMotion(new Modal(this.app));
    modal.onOpen = () => {
      const { contentEl } = modal;
      contentEl.empty();
      contentEl.addClass('momo-task-actions-modal');
      contentEl.createEl('h2', { text:item.title });

      const actions = contentEl.createDiv({ cls:'momo-task-actions-list' });
      const addAction = (label, handler, danger=false) => {
        const b = actions.createEl('button', { text:label });
        if (danger) b.addClass('momo-task-action-danger');
        b.onclick = async () => {
          modal.close();
          await handler();
        };
      };
      const addQuickMove = (label, targetDate) => {
        if (!targetDate || targetDate === item.date) return;
        addAction(label, async () => {
          await this.plugin.runUndoableAction('task-move', () => moveTaskToDate(this.app, item, targetDate));
          this.plugin.invalidateFile(item.filePath);
          this.plugin.invalidateFile(`${DATA_FOLDER}/${targetDate.slice(0,7)}.md`);
          // 빠른 날짜 이동은 목록의 기준 날짜를 바꾸지 않는다.
          await this.render();
          new Notice(uiText('movedDate',{name:item.title,date:formatKoreanDate(targetDate)}));
        });
      };

      if (item.routineId) {
        addAction(uiText('routineEdit'), async () => {
          const routines = await this.plugin.loadRoutines();
          const routine = routines.find(r => r.id === item.routineId);
          if (!routine) {
            new Notice(uiText('noRoutineSource'));
            return;
          }
          await this.plugin.openRoutineEditor(routine);
        });
        addAction(uiText('editDaily'), async () => this.openTaskEditor(item));
        {
          const isToday = item.date === todaySeoul();
          const defaultDate = isToday ? shiftDay(item.date, 1) : todaySeoul();
          addAction(uiText('changeDate'), async () => {
            const targetDate = await openDateChoiceModal(this.app, defaultDate);
            if (!targetDate || targetDate === item.date) return;
            await this.plugin.runUndoableAction('task-move', () => moveTaskToDate(this.app, item, targetDate));
            this.plugin.invalidateFile(item.filePath);
            this.plugin.invalidateFile(`${DATA_FOLDER}/${targetDate.slice(0,7)}.md`);
            // 날짜 선택 이동도 이동 전 날짜 화면을 유지한다.
            await this.render();
            new Notice(uiText('movedDate',{name:item.title,date:formatKoreanDate(targetDate)}));
          });
        }
        addQuickMove(uiText('moveTodayQuick'), todaySeoul());
        // 금일이 아닌 날짜에서는 빠른 이동을 '금일 이동'만 노출한다.
        if (item.date === todaySeoul()) {
          addQuickMove(uiText('moveTomorrowQuick'), shiftDay(todaySeoul(), 1));
        }
        addAction(uiText('copyTask'), async () => {
          const targetDates = await openMultiDateChoiceModal(this.app, todaySeoul());
          if (!targetDates?.length) return;

          await this.plugin.runUndoableAction('task-copy', async () => {
            for (const targetDate of targetDates) {
              const path = await repeatTaskOnDate(this.app, item, targetDate);
              if (path) this.plugin.invalidateFile(path);
            }
          });

          this.plugin.setSelectedDate(targetDates[0]);
          new Notice(uiText('copiedDates',{name:cleanLegacyTaskTitle(item.title),n:targetDates.length}));
        });
        addAction(uiText('deleteDaily'), async () => {
          const ok = window.confirm(uiText('deleteOccurrenceConfirm',{name:item.title}));
          if (!ok) return;
          await this.plugin.runUndoableAction('task-delete', () => deleteTaskInstance(this.app, item));
          this.plugin.invalidateFile(item.filePath);
          await this.render();
          new Notice(uiText('deletedTask',{name:item.title}));
        }, true);
      } else {
        addAction(uiText('editTask'), async () => this.openTaskEditor(item));
        {
          const isToday = item.date === todaySeoul();
          const defaultDate = isToday ? shiftDay(item.date, 1) : todaySeoul();
          addAction(uiText('changeDate'), async () => {
            const targetDate = await openDateChoiceModal(this.app, defaultDate);
            if (!targetDate || targetDate === item.date) return;
            await this.plugin.runUndoableAction('task-move', () => moveTaskToDate(this.app, item, targetDate));
            this.plugin.invalidateFile(item.filePath);
            this.plugin.invalidateFile(`${DATA_FOLDER}/${targetDate.slice(0,7)}.md`);
            // 날짜 선택 이동도 이동 전 날짜 화면을 유지한다.
            await this.render();
            new Notice(uiText('movedDate',{name:item.title,date:formatKoreanDate(targetDate)}));
          });
        }
        addQuickMove(uiText('moveTodayQuick'), todaySeoul());
        // 금일이 아닌 날짜에서는 빠른 이동을 '금일 이동'만 노출한다.
        if (item.date === todaySeoul()) {
          addQuickMove(uiText('moveTomorrowQuick'), shiftDay(todaySeoul(), 1));
        }
        addAction(uiText('copyTask'), async () => {
          const targetDates = await openMultiDateChoiceModal(this.app, todaySeoul());
          if (!targetDates?.length) return;

          await this.plugin.runUndoableAction('task-copy', async () => {
            for (const targetDate of targetDates) {
              const path = await repeatTaskOnDate(this.app, item, targetDate);
              if (path) this.plugin.invalidateFile(path);
            }
          });

          this.plugin.setSelectedDate(targetDates[0]);
          new Notice(uiText('copiedDates',{name:cleanLegacyTaskTitle(item.title),n:targetDates.length}));
        });
        addAction(uiText('deleteTaskAction'), async () => {
          const ok = window.confirm(uiText('deleteTaskConfirm',{name:item.title}));
          if (!ok) return;
          await this.plugin.runUndoableAction('task-delete', () => deleteTaskInstance(this.app, item));
          this.plugin.invalidateFile(item.filePath);
          await this.render();
          new Notice(uiText('deletedTask',{name:item.title}));
        }, true);
      }
    };
    modal.open();
  }

  async openTaskEditor(item, { selectTitle=false }={}) {
    const { Modal } = require('obsidian');
    const modal = enableModalMotion(new Modal(this.app));
    modal.onOpen = () => {
      const { contentEl } = modal;
      contentEl.empty();
      contentEl.addClass('momo-task-editor-modal');
      contentEl.createEl('h2', { text:item.routineId ? uiText('editDaily') : uiText('editTask') });

      const form = contentEl.createDiv({ cls:'momo-task-editor-form' });
      const makeRow = (label) => {
        const row = form.createDiv({ cls:'momo-task-editor-row' });
        row.createDiv({ text:label, cls:'momo-task-editor-label' });
        return row.createDiv({ cls:'momo-task-editor-control' });
      };

      const title = stabilizeTextInput(makeRow(uiText('name')).createEl('input'));
      title.type = 'text';
      title.value = item.title || '';

      let selectedCategory = item.category || '기타';
      let selectedGroup = item.group || '기타';

      const category = createPillField(makeRow(uiText('category')), selectedCategory);
      const group = createPillField(makeRow(uiText('group')), selectedGroup);

      category.onclick = async () => {
        const picked = await this.plugin.openCategoryChoiceModal(uiText('chooseCategory'), selectedCategory);
        if (picked === null) return;
        selectedCategory = picked;
        category.setText(picked);
        const presets = GROUP_PRESETS[picked] || ['기타'];
        if (!presets.includes(selectedGroup)) {
          selectedGroup = '기타';
          group.setText('기타');
        }
      };
      group.onclick = async () => {
        const picked = await this.plugin.openGroupChoiceModal(uiText('chooseGroup'), selectedCategory, selectedGroup);
        if (picked === null) return;
        selectedGroup = picked;
        group.setText(selectedGroup);
      };

      const date = createDatePicker(this.app, makeRow(uiText('date')), item.date);

      const time = createTimeSelect(this.app, makeRow(uiText('time')), item.time || '');

      const location = stabilizeTextInput(makeRow(uiText('location')).createEl('input'));
      location.type = 'text';
      location.value = item.location || '';

      const buttons = contentEl.createDiv({ cls:'momo-task-editor-buttons' });
      const cancel = buttons.createEl('button', { text:uiText('cancel') });
      const save = buttons.createEl('button', { text:uiText('save'), cls:'mod-cta' });
      cancel.onclick = () => modal.close();

      save.onclick = async () => {
        const name = title.value.trim();
        if (!name) { new Notice(uiText('enterName')); title.focus(); return; }
        const targetDate = date.value || item.date;
        await this.plugin.runUndoableAction('task-edit', () => updateTaskInstance(this.app, item, {
          title:name,
          category:selectedCategory,
          group:selectedGroup,
          date:targetDate,
          time:time.value || null,
          location:location.value.trim() || null,
          occurrenceOverride:item.routineId ? true : Boolean(item.occurrenceOverride)
        }));
        this.plugin.invalidateFile(item.filePath);
        modal.close();
        await this.render();
        new Notice(item.routineId ? uiText('occurrenceUpdated') : uiText('taskUpdated'));
      };
      enableTaskTitleEnterFlow(title, save);
      enableTaskEditorSubmitShortcut(contentEl, save);
      setTimeout(() => {
        title.focus();
        if (selectTitle) title.select();
      }, 30);
    };
    modal.open();
  }
}


function cleanRoutineGhostLines(text, validRoutineIds) {
  const lines = text.split('\n');
  const out = [];
  const seenGhosts = new Set();
  let currentDate = null;
  let changed = false;

  for (const line of lines) {
    const h = line.trim().match(/^##\s+(\d{4}-\d{2}-\d{2})$/);
    if (h) {
      currentDate = h[1];
      out.push(line);
      continue;
    }
    if (/^##\s+/.test(line)) currentDate = null;

    const routineId = (line.match(/\[routineId::\s*([^\]]+)\]/)||[])[1] || null;
    const suppressed = /\[momoSuppressed::\s*true\]/.test(line);

    if (currentDate && routineId && suppressed) {
      // 루틴 원본이 삭제된 잔상은 자동 제거합니다.
      if (!validRoutineIds.has(routineId)) {
        changed = true;
        continue;
      }
      // 같은 날짜의 같은 루틴 잔상은 하나만 유지합니다.
      const key = `${currentDate}::${routineId}`;
      if (seenGhosts.has(key)) {
        changed = true;
        continue;
      }
      seenGhosts.add(key);
    }
    out.push(line);
  }
  return { changed, text:out.join('\n') };
}

function parseMonthFile(text,filePath) {
  const lines=text.split('\n');
  const map=new Map();
  let currentDate=null;
  for(let i=0;i<lines.length;i++) {
    const line=lines[i];
    const h=line.trim().match(/^##\s+(\d{4}-\d{2}-\d{2})$/);
    if(h) {
      currentDate=h[1];
      if(!map.has(currentDate)) map.set(currentDate,[]);
      continue;
    }
    if(/^##\s+/.test(line)) { currentDate=null; continue; }
    if(!currentDate) continue;
    if(!/^- \[[ xX]\] /.test(line)) continue;
    const item=parseTaskLine(line,i,filePath,currentDate);
    if(item) map.get(currentDate).push(item);
  }
  return map;
}

function parseTaskLine(raw,lineIndex,filePath,date) {
  const done=/^- \[[xX]\] /.test(raw);
  let visible=raw.replace(/^- \[[ xX]\] /,'').trim();
  const time=(raw.match(/\[startTime::\s*(\d{2}:\d{2})\]/)||[])[1]||null;
  const location=(raw.match(/\[location::\s*([^\]]+)\]/)||[])[1]?.trim()||null;
  const routineId=(raw.match(/\[routineId::\s*([^\]]+)\]/)||[])[1]||null;
  const sourceGroup=(raw.match(/\[sourceGroup::\s*([^\]]+)\]/)||[])[1]?.trim()||null;
  const suppressed=/\[momoSuppressed::\s*true\]/.test(raw);
  const preview=/\[momoPreview::\s*true\]/.test(raw);
  const skipped=/\[momoSkipped::\s*true\]/.test(raw);
  const occurrenceOverride=/\[momoOverride::\s*true\]/.test(raw);
  const suppressedReason=(raw.match(/\[momoSuppressedReason::\s*([^\]]+)\]/)||[])[1]?.trim()||null;
  const movedFrom=(raw.match(/\[momoMovedFrom::\s*(\d{4}-\d{2}-\d{2})\]/)||[])[1]||null;
  const occurrenceDate=(raw.match(/\[momoOccurrence::\s*(\d{4}-\d{2}-\d{2})\]/)||[])[1] || (routineId ? (movedFrom || date) : null);

  let category='기타';
  for (const [tag,cat] of Object.entries(TAG_TO_CATEGORY)) {
    if (new RegExp(`(^|\\s)${escapeRegex(tag)}(?=\\s|$)`).test(visible)) { category=cat; break; }
  }

  visible=visible
    .replace(/\s*\[[^\]]+::[^\]]*\]/g,'')
    .replace(/\s*⏳\s*\d{4}-\d{2}-\d{2}/g,'')
    .replace(/\s*✅\s*\d{4}-\d{2}-\d{2}/g,'')
    .replace(/(^|\s)#[^\s#]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();

  if (visible.startsWith('비밀 - ')) visible = visible.slice('비밀 - '.length).trim();
  let group = sourceGroup === '비밀' ? '기타' : (sourceGroup || '기타');
  if (sourceGroup && sourceGroup !== '비밀') rememberGroupLocal(category, sourceGroup, { touchRecent:false, persistDiscovery:true });
  let title = visible;
  if (sourceGroup && visible.startsWith(`${sourceGroup} - `)) {
    title = visible.slice(`${sourceGroup} - `.length).trim();
  }
  if (!sourceGroup) {
    const sep = visible.indexOf(' - ');
    if (sep > 0) {
      const prefix = visible.slice(0,sep).trim();
      const rest = visible.slice(sep+3).trim();
      if (isKnownGroup(category,prefix) || (GROUP_PRESETS[category]||[]).includes(prefix)) {
        group=prefix;
        title=rest;
      }
    }
    const colon=title.match(/^([^:]{1,30}):\s*(.+)$/);
    if(colon && isKnownGroup(category,colon[1].trim())) {
      group=colon[1].trim(); title=colon[2].trim();
    }
  }

  return {
    raw,
    lineIndex,
    filePath,
    date,
    isTask:!suppressed && !preview && !skipped,
    done:(suppressed || preview || skipped) ? false : done,
    time,
    location,
    category,
    group,
    title,
    routineId,
    suppressed,
    preview,
    skipped,
    occurrenceOverride,
    suppressedReason,
    movedFrom,
    occurrenceDate
  };
}

function isKnownGroup(category,group) {
  if (group === '비밀') return false;
  // Parsing must be deterministic across devices. localStorage contains only
  // per-device UI recency/history, so it must never decide markdown taxonomy.
  if ((GROUP_PRESETS[category]||[]).includes(group)) return true;
  return ['오행','밀리로드','도라셔다','우치','포트폴리오','지원'].includes(group);
}
function isHiddenGroup(category,group) {
  try {
    const hidden=JSON.parse(momoLocalGet(`momo.todo.hiddenGroups.${category}`)||'[]');
    return Array.isArray(hidden) && hidden.includes(group);
  } catch (_) { return false; }
}



function cleanLegacyTaskTitle(title) {
  return String(title || '')
    .replace(/^(?:지인|본인|친구)\s*-\s*/u, '')
    .trim();
}

function normalizeTaskGroup(group) {
  if (!group || group === '기타' || group === '루틴' || group === '그룹 없음') return null;
  return String(group).trim();
}

function classifyCanonicalTaxonomy(category, group) {
  const cat = String(category || '기타').trim();
  const g = normalizeTaskGroup(group);

  // 이름 자체가 강한 근거가 되는 그룹은 기존 카테고리보다 우선합니다.
  if (['오행','살바람','여름을 훔친 아이'].includes(g)) {
    return { category:'창작', group:g };
  }
  if (g === '도라셔다') return { category:'업무', group:'도라셔다' };
  if (['우치','포트폴리오','지원','커리어'].includes(g) || cat === '커리어') {
    return { category:'업무', group:'커리어' };
  }
  if (g === '병원') return { category:'약속', group:'공적 약속' };
  if (['가족','친구','모임','사적 약속'].includes(g)) {
    return { category:'약속', group:'사적 약속' };
  }
  if (g === '공적 약속') return { category:'약속', group:'공적 약속' };
  if (g === '운동') return { category:'생활', group:'운동' };
  if (['정리','청소'].includes(g)) return { category:'생활', group:'정리' };
  if (['온라인','오프라인','쇼핑'].includes(g)) return { category:'생활', group:'쇼핑' };
  if (g === '루틴') return { category:'생활', group:'루틴' };
  if (['게임','독서','영화'].includes(g)) return { category:'취미', group:g };
  if (g === '기념일') return { category:'기념일', group:'기념일' };
  if (['지인','생일'].includes(g) || cat === '생일') return { category:'기념일', group:'생일' };

  // 과거 카테고리 기준 fallback
  if (cat === '창작') return { category:'창작', group:null };

  if (['업무','프로젝트'].includes(cat)) {
    if (g === '도라셔다' || cat === '프로젝트') return { category:'업무', group:'도라셔다' };
    return { category:'업무', group:'에픽세븐' };
  }

  if (cat === '약속') {
    return { category:'약속', group:g === '공적 약속' ? '공적 약속' : '사적 약속' };
  }

  if (['건강','몸 관리'].includes(cat)) {
    if (g === '병원') return { category:'약속', group:'공적 약속' };
    if (g === '운동') return { category:'생활', group:'운동' };
    return { category:'생활', group:'기타' };
  }

  if (['생활','생활 습관','집안일','쇼핑'].includes(cat)) {
    if (cat === '생활 습관') return { category:'생활', group:'루틴' };
    if (cat === '집안일') return { category:'생활', group:'정리' };
    if (cat === '쇼핑') return { category:'생활', group:'쇼핑' };
    return { category:'생활', group:'기타' };
  }

  if (cat === '취미') {
    return { category:'취미', group:['게임','독서','영화'].includes(g) ? g : '기타' };
  }

  if (cat === '기념일') {
    return { category:'기념일', group:g === '기념일' ? '기념일' : '생일' };
  }

  return { category:'기타', group:null };
}

function hasCategoryTagCollision(name, ignoreCategory=null) {
  const candidate = makeCategoryTag(name);
  return CATEGORIES.some(category => {
    if (category === ignoreCategory) return false;
    const existing = CATEGORY_TAGS[category] || makeCategoryTag(category);
    return existing === candidate;
  });
}

function normalizeCategoryName(value) {
  return String(value || '').replace(/[\r\n#\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
}
function makeCategoryTag(category) {
  const normalized = normalizeCategoryName(category).replace(/\s+/g, '');
  return normalized ? `#${normalized}` : '#기타';
}
function ensureCategoryRuntime(category) {
  if (!CATEGORY_TAGS[category]) CATEGORY_TAGS[category] = makeCategoryTag(category);
  TAG_TO_CATEGORY[CATEGORY_TAGS[category]] = category;
  if (!COLORS[category]) COLORS[category] = '#8a8f98';
  const groups = (GROUP_PRESETS[category] || []).filter(x => x && x !== '기타' && x !== '그룹 없음');
  GROUP_PRESETS[category] = [...new Set(groups), '기타'];
}

function rememberGroupLocal(category, group, options={}) {
  const clean = normalizeCategoryName(group);
  if (!clean || clean === '기타' || clean === '루틴' || clean === '그룹 없음') return false;
  const touchRecent = options.touchRecent !== false;
  const persistDiscovery = options.persistDiscovery === true;
  if (!GROUP_PRESETS[category]) GROUP_PRESETS[category] = [];
  let added = false;
  if (!GROUP_PRESETS[category].includes(clean)) {
    const otherIndex = GROUP_PRESETS[category].indexOf('기타');
    GROUP_PRESETS[category].splice(otherIndex >= 0 ? otherIndex : GROUP_PRESETS[category].length, 0, clean);
    added = true;
  }
  if (touchRecent) {
    try {
      const recentKey = `momo.todo.recentGroups.${category}`;
      const recent = JSON.parse(momoLocalGet(recentKey) || '[]');
      const next = [clean, ...(Array.isArray(recent) ? recent.filter(x => x !== clean) : [])].slice(0, 50);
      momoLocalSet(recentKey, JSON.stringify(next));
      const hiddenKey = `momo.todo.hiddenGroups.${category}`;
      const hidden = JSON.parse(momoLocalGet(hiddenKey) || '[]');
      if (Array.isArray(hidden) && hidden.includes(clean)) {
        momoLocalSet(hiddenKey, JSON.stringify(hidden.filter(x => x !== clean)));
      }
    } catch (_) {}
  }
  if (added && persistDiscovery) queueDiscoveredGroupPersist();
  return added;
}

function migrateGroupLocalStorage(category, from, to) {
  try {
    for (const prefix of ['momo.todo.recentGroups.','momo.todo.hiddenGroups.']) {
      const key = `${prefix}${category}`;
      const values = JSON.parse(momoLocalGet(key) || '[]');
      if (Array.isArray(values)) {
        momoLocalSet(key, JSON.stringify([...new Set(values.map(x => x === from ? to : x))]));
      }
    }
    const lastKey = `momo.todo.lastGroup.${category}`;
    if (momoLocalGet(lastKey) === from) momoLocalSet(lastKey, to);
  } catch (_) {}
}

function removeGroupLocalStorage(category, group) {
  try {
    for (const prefix of ['momo.todo.recentGroups.','momo.todo.hiddenGroups.']) {
      const key = `${prefix}${category}`;
      const values = JSON.parse(momoLocalGet(key) || '[]');
      if (Array.isArray(values)) momoLocalSet(key, JSON.stringify(values.filter(x => x !== group)));
    }
    const lastKey = `momo.todo.lastGroup.${category}`;
    if (momoLocalGet(lastKey) === group) momoLocalSet(lastKey, '__none__');
  } catch (_) {}
}

function migrateCategoryLocalStorage(from, to) {
  try {
    for (const prefix of ['momo.todo.recentGroups.','momo.todo.hiddenGroups.','momo.todo.lastGroup.']) {
      const oldKey = `${prefix}${from}`;
      const newKey = `${prefix}${to}`;
      const value = momoLocalGet(oldKey);
      if (value !== null) momoLocalSet(newKey, value);
      momoLocalRemove(oldKey);
    }
    if (momoLocalGet('momo.todo.prefillCategory') === from) momoLocalSet('momo.todo.prefillCategory', to);
  } catch (_) {}
}
function clearCategoryLocalStorage(category) {
  try {
    for (const prefix of ['momo.todo.recentGroups.','momo.todo.hiddenGroups.','momo.todo.lastGroup.']) {
      momoLocalRemove(`${prefix}${category}`);
    }
    if (momoLocalGet('momo.todo.prefillCategory') === category) momoLocalSet('momo.todo.prefillCategory', '기타');
  } catch (_) {}
}
function categoryTag(category) {
  ensureCategoryRuntime(category);
  return CATEGORY_TAGS[category] || '#기타';
}

function buildTaskLine(item, patch={}) {
  const next = { ...item, ...patch };
  const preview = next.preview === true;
  const skipped = next.skipped === true;
  const checked = next.suppressed ? ' ' : (next.done ? 'x' : ' ');
  let cleanTitle = String(next.title || '').trim();
  if (next.group && next.group !== '기타' && next.group !== '루틴' && cleanTitle.startsWith(`${next.group} - `)) {
    cleanTitle = cleanTitle.slice(`${next.group} - `.length).trim();
  }
  let line = `- [${checked}] ${cleanTitle} ${categoryTag(next.category)}`;
  line += ` ⏳ ${next.date}`;
  if (next.routineId) {
    line += ` [routineId:: ${next.routineId}]`;
    const occurrenceDate = next.occurrenceDate || next.movedFrom || next.date;
    if (occurrenceDate) line += ` [momoOccurrence:: ${occurrenceDate}]`;
  }
  if (next.group && next.group !== '기타') line += ` [sourceGroup:: ${next.group}]`;
  if (next.time) line += ` [startTime:: ${next.time}]`;
  if (next.location) line += ` [location:: ${next.location}]`;
  if (next.suppressed) {
    line += ` [momoSuppressed:: true]`;
    if (next.suppressedReason) line += ` [momoSuppressedReason:: ${next.suppressedReason}]`;
  }
  if (next.movedFrom) line += ` [momoMovedFrom:: ${next.movedFrom}]`;
  if (next.occurrenceOverride) line += ` [momoOverride:: true]`;
  if (preview) line += ` [momoPreview:: true]`;
  if (skipped) line += ` [momoSkipped:: true]`;
  if (next.done && !next.suppressed && !preview && !skipped) {
    const doneDate = (String(item.raw || next.raw || '').match(/✅\s*(\d{4}-\d{2}-\d{2})/)||[])[1] || todaySeoul();
    line += ` ✅ ${doneDate}`;
  }
  return line;
}


function compareAutoSortCriterion(a, b, criterion, config) {
  if (criterion === 'time') {
    const aHasTime = Boolean(a?.time);
    const bHasTime = Boolean(b?.time);
    if (aHasTime !== bHasTime) {
      const timedFirst = config.timedPlacement !== 'last';
      return aHasTime === timedFirst ? -1 : 1;
    }
    if (aHasTime && bHasTime && a.time !== b.time) return String(a.time).localeCompare(String(b.time));
    return 0;
  }

  const aTitle = cleanLegacyTaskTitle(a?.title || '');
  const bTitle = cleanLegacyTaskTitle(b?.title || '');
  if (criterion === 'titleLength') {
    const diff = Array.from(aTitle).length - Array.from(bTitle).length;
    return diff || 0;
  }
  if (criterion === 'alphabet') {
    return aTitle.localeCompare(bTitle, ACTIVE_LANGUAGE === 'ko' ? 'ko' : undefined);
  }
  if (criterion === 'manual') {
    return (a?.lineIndex ?? 0) - (b?.lineIndex ?? 0);
  }
  return 0;
}

function taskAutoSortComparator(a, b, settings={}) {
  const config = normalizedAutoSortSettings(settings);

  if (config.completedPlacement === 'bottom' && Boolean(a?.done) !== Boolean(b?.done)) {
    return a?.done ? 1 : -1;
  }

  const aRoutine = Boolean(a?.routineId);
  const bRoutine = Boolean(b?.routineId);
  if (config.routinePlacement !== 'mixed' && aRoutine !== bRoutine) {
    if (config.routinePlacement === 'routineFirst') return aRoutine ? -1 : 1;
    return aRoutine ? 1 : -1;
  }

  for (const criterion of config.priorities) {
    const compared = compareAutoSortCriterion(a, b, criterion, config);
    if (compared) return compared;
  }

  // Stable final tie-breaker: never scramble a manually arranged order when
  // all configured rules consider two tasks equivalent.
  return (a?.lineIndex ?? 0) - (b?.lineIndex ?? 0);
}

async function autoSortTasksForDate(app, date, settings={}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return { changed:false, result:null, file:null };
  const filePath = `${DATA_FOLDER}/${date.slice(0,7)}.md`;
  return mutateTextFile(app, filePath, text => {
    const lines = text.split('\n');
    const buckets = new Map();
    let currentDate = null;

    for (let i = 0; i < lines.length; i++) {
      const heading = lines[i].trim().match(/^##\s+(\d{4}-\d{2}-\d{2})$/);
      if (heading) {
        currentDate = heading[1];
        continue;
      }
      if (/^##\s+/.test(lines[i])) {
        currentDate = null;
        continue;
      }
      if (currentDate !== date || !/^- \[[ xX]\] /.test(lines[i])) continue;

      const item = parseTaskLine(lines[i], i, filePath, date);
      // Preview / suppressed / skipped routine bookkeeping is not user ordering.
      if (!item?.isTask) continue;
      const key = `${item.category}\u0000${item.group || '기타'}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push({ index:i, item });
    }

    let reorderedGroups = 0;
    let reorderedTasks = 0;
    for (const entries of buckets.values()) {
      if (entries.length < 2) continue;
      const sorted = entries.map(entry => entry.item).sort((a,b) => taskAutoSortComparator(a,b,settings));
      const before = entries.map(entry => entry.item.raw);
      const after = sorted.map(item => item.raw);
      if (before.every((line, index) => line === after[index])) continue;
      entries.forEach((entry, index) => { lines[entry.index] = after[index]; });
      reorderedGroups += 1;
      reorderedTasks += entries.length;
    }

    return {
      text:lines.join('\n'),
      result:{ reorderedGroups, reorderedTasks }
    };
  });
}

async function moveTaskNearTask(app, item, targetItem, placeAfter=false) {
  if (!item || !targetItem || item === targetItem) return false;
  if (item.filePath !== targetItem.filePath || item.date !== targetItem.date) return false;
  if (item.category !== targetItem.category) return false;
  if (normalizeTaskGroup(item.group) !== normalizeTaskGroup(targetItem.group)) return false;

  let moved = false;
  await mutateTextFile(app, item.filePath, text => {
    const lines = text.split('\n');
    let sourceIdx = item.lineIndex;
    if (sourceIdx < 0 || lines[sourceIdx] !== item.raw) sourceIdx = lines.indexOf(item.raw);
    let targetIdx = targetItem.lineIndex;
    if (targetIdx < 0 || lines[targetIdx] !== targetItem.raw) targetIdx = lines.indexOf(targetItem.raw);
    if (sourceIdx < 0 || targetIdx < 0 || sourceIdx === targetIdx) return text;

    const [sourceLine] = lines.splice(sourceIdx, 1);
    if (sourceIdx < targetIdx) targetIdx -= 1;
    lines.splice(targetIdx + (placeAfter ? 1 : 0), 0, sourceLine);
    moved = true;
    return lines.join('\n');
  });
  return moved;
}

async function resolveTaskLine(app, item) {
  const file = app.vault.getAbstractFileByPath(item.filePath);
  if (!file) return null;
  const text = await app.vault.read(file);
  const lines = text.split('\n');
  let idx = item.lineIndex;
  if (lines[idx] !== item.raw) idx = lines.indexOf(item.raw);
  if (idx < 0) return null;
  return { file, text, lines, idx };
}

async function ensureVaultFolderPath(app, folderPath) {
  const clean = normalizeVaultPath(folderPath);
  if (!clean) return;
  const parts = clean.split('/').filter(Boolean);
  let current = '';
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    if (app.vault.getAbstractFileByPath(current)) continue;
    try { await app.vault.createFolder(current); } catch (_) {}
  }
}

function ensureDateSectionText(text, date) {
  const heading = `## ${date}`;
  if (new RegExp(`^${escapeRegex(heading)}$`, 'm').test(text)) return text;
  const metaIndex = text.search(/^## _루틴 메타$/m);
  if (metaIndex >= 0) {
    return `${text.slice(0, metaIndex).trimEnd()}\n\n${heading}\n\n${text.slice(metaIndex)}`;
  }
  return `${text.trimEnd()}\n\n${heading}\n`;
}

async function ensureDateSectionInMonthFile(app, filePath, date) {
  const base = `---\ntype: task-log\nmonth: ${date.slice(0,7)}\n---\n\n# ${date.slice(0,7)}\n`;
  const outcome = await mutateTextFile(app, filePath, text => ensureDateSectionText(text, date), { createContent:base });
  return outcome.file;
}

async function insertTaskUnderDate(app, filePath, date, line, options={}) {
  const base = `---\ntype: task-log\nmonth: ${date.slice(0,7)}\n---\n\n# ${date.slice(0,7)}\n`;
  let inserted = false;
  await mutateTextFile(app, filePath, original => {
    let text = ensureDateSectionText(original, date);
    const heading = `## ${date}`;
    const start = text.indexOf(heading);
    if (start < 0) return text;
    const bodyStart = start + heading.length;
    const nextHeading = text.indexOf('\n## ', bodyStart);
    const end = nextHeading >= 0 ? nextHeading : text.length;

    if (options.routineId) {
      const section = text.slice(bodyStart, end);
      const wantedOccurrence = options.occurrenceDate || date;
      for (const existingLine of section.split('\n')) {
        if (!/^- \[[ xX]\] /.test(existingLine)) continue;
        const rid = (existingLine.match(/\[routineId::\s*([^\]]+)\]/)||[])[1] || null;
        if (rid !== options.routineId) continue;
        const explicitOccurrence = (existingLine.match(/\[momoOccurrence::\s*(\d{4}-\d{2}-\d{2})\]/)||[])[1] || null;
        const movedFrom = (existingLine.match(/\[momoMovedFrom::\s*(\d{4}-\d{2}-\d{2})\]/)||[])[1] || null;
        const lineOccurrence = explicitOccurrence || movedFrom || date;
        const suppressed = /\[momoSuppressed::\s*true\]/.test(existingLine);
        if (lineOccurrence === wantedOccurrence && !suppressed) return text;
      }
    }

    const before = text.slice(0, end).trimEnd();
    const after = text.slice(end);
    inserted = true;
    return `${before}\n${line}\n${after.startsWith('\n') ? after : '\n' + after}`;
  }, { createContent:base });
  return inserted;
}

async function hardDeleteTaskInstance(app, item) {
  await mutateTextFile(app, item.filePath, text => {
    const lines = text.split('\n');
    let idx = item.lineIndex;
    if (idx < 0 || lines[idx] !== item.raw) idx = lines.indexOf(item.raw);
    if (idx < 0) return text;
    lines.splice(idx, 1);
    return lines.join('\n');
  });
}

async function deleteTaskInstance(app, item) {
  await mutateTextFile(app, item.filePath, text => {
    const lines = text.split('\n');
    let idx = item.lineIndex;
    if (idx < 0 || lines[idx] !== item.raw) idx = lines.indexOf(item.raw);
    if (idx < 0) return text;
    if (item.routineId && !item.movedFrom) {
      lines[idx] = buildTaskLine(item,{suppressed:true,suppressedReason:'deleted',occurrenceOverride:true,done:false});
    } else {
      lines.splice(idx,1);
    }
    return lines.join('\n');
  });
}

async function repeatTaskOnDate(app, item, targetDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(targetDate || ''))) return null;
  const targetPath = `${DATA_FOLDER}/${targetDate.slice(0,7)}.md`;
  const copy = {
    ...item,
    title:cleanLegacyTaskTitle(item.title),
    date:targetDate,
    done:false,
    preview:false,
    skipped:false,
    suppressed:false,
    suppressedReason:null,
    movedFrom:null,
    occurrenceDate:null,
    routineId:null,
    raw:null,
    lineIndex:-1,
    filePath:targetPath
  };
  const line = buildTaskLine(copy, {
    date:targetDate, done:false, preview:false, skipped:false, suppressed:false,
    suppressedReason:null, movedFrom:null, occurrenceDate:null, routineId:null
  });
  await insertTaskUnderDate(app, targetPath, targetDate, line);
  return targetPath;
}

async function runRoutineIntegrityCheckAfterMutation(item) {
  if (!item?.routineId || !ACTIVE_MOMO_PLUGIN?.runRoutineIntegritySelfCheck) return;
  try {
    const routines = await ACTIVE_MOMO_PLUGIN.loadRoutines();
    await ACTIVE_MOMO_PLUGIN.runRoutineIntegritySelfCheck(routines);
  } catch (error) {
    console.warn('Momoan Todo · post-mutation invariant check failed:', error);
  }
}

async function moveTaskToDate(app, item, targetDate) {
  const targetMonth = targetDate.slice(0,7);
  const sourceMonth = item.date.slice(0,7);
  const targetPath = sourceMonth === targetMonth
    ? item.filePath
    : `${item.filePath.split('/').slice(0,-1).join('/')}/${targetMonth}.md`;
  const occurrenceDate = item.occurrenceDate || item.movedFrom || item.date;
  const movedLine = buildTaskLine(item,{
    date:targetDate,
    occurrenceDate,
    suppressed:false,
    suppressedReason:null,
    movedFrom:occurrenceDate,
    occurrenceOverride:Boolean(item.routineId)
  });

  let sourceChanged = false;
  await mutateTextFile(app, item.filePath, text => {
    const lines = text.split('\n');
    let idx = item.lineIndex;
    if (idx < 0 || lines[idx] !== item.raw) idx = lines.indexOf(item.raw);
    if (idx < 0) return text;
    if (item.routineId) lines[idx] = buildTaskLine(item,{suppressed:true,suppressedReason:'moved',occurrenceOverride:true,done:false});
    else lines.splice(idx,1);
    sourceChanged = true;
    return lines.join('\n');
  });
  if (!sourceChanged) return;

  await insertTaskUnderDate(app, targetPath, targetDate, movedLine, item.routineId ? {
    routineId:item.routineId,
    occurrenceDate
  } : {});
  await runRoutineIntegrityCheckAfterMutation(item);
}

async function updateTaskInstance(app, item, patch) {
  const targetDate = patch.date || item.date;
  if (targetDate !== item.date) {
    const targetMonth = targetDate.slice(0,7);
    const sourceMonth = item.date.slice(0,7);
    const targetPath = sourceMonth === targetMonth
      ? item.filePath
      : `${item.filePath.split('/').slice(0,-1).join('/')}/${targetMonth}.md`;
    const occurrenceDate = item.occurrenceDate || item.movedFrom || item.date;
    const movedLine = buildTaskLine(item,{
      ...patch,
      date:targetDate,
      occurrenceDate,
      suppressed:false,
      suppressedReason:null,
      movedFrom:occurrenceDate,
      occurrenceOverride:Boolean(item.routineId || patch.occurrenceOverride)
    });

    let sourceChanged = false;
    await mutateTextFile(app, item.filePath, text => {
      const lines = text.split('\n');
      let idx = item.lineIndex;
      if (idx < 0 || lines[idx] !== item.raw) idx = lines.indexOf(item.raw);
      if (idx < 0) return text;
      if (item.routineId) lines[idx] = buildTaskLine(item,{suppressed:true,suppressedReason:'moved',occurrenceOverride:true,done:false});
      else lines.splice(idx,1);
      sourceChanged = true;
      return lines.join('\n');
    });
    if (!sourceChanged) return;

    await insertTaskUnderDate(app, targetPath, targetDate, movedLine, item.routineId ? {
      routineId:item.routineId,
      occurrenceDate
    } : {});
    await runRoutineIntegrityCheckAfterMutation(item);
    return;
  }

  await mutateTextFile(app, item.filePath, text => {
    const lines = text.split('\n');
    let idx = item.lineIndex;
    if (idx < 0 || lines[idx] !== item.raw) idx = lines.indexOf(item.raw);
    if (idx < 0) return text;
    lines[idx] = buildTaskLine(item, patch);
    return lines.join('\n');
  });
  await runRoutineIntegrityCheckAfterMutation(item);
}


async function hasActiveRoutineOccurrenceAt(app, filePath, date, routineId, occurrenceDate) {
  const file = app.vault.getAbstractFileByPath(filePath);
  if (!file) return false;
  const text = await app.vault.read(file);
  let current = null;
  for (const line of text.split('\n')) {
    const h = line.trim().match(/^##\s+(\d{4}-\d{2}-\d{2})$/);
    if (h) { current = h[1]; continue; }
    if (/^##\s+/.test(line)) { current = null; continue; }
    if (current !== date || !/^- \[[ xX]\] /.test(line)) continue;

    const rid = (line.match(/\[routineId::\s*([^\]]+)\]/)||[])[1] || null;
    if (rid !== routineId) continue;

    const explicitOccurrence = (line.match(/\[momoOccurrence::\s*(\d{4}-\d{2}-\d{2})\]/)||[])[1] || null;
    const movedFrom = (line.match(/\[momoMovedFrom::\s*(\d{4}-\d{2}-\d{2})\]/)||[])[1] || null;
    const lineOccurrence = explicitOccurrence || movedFrom || current;
    const suppressed = /\[momoSuppressed::\s*true\]/.test(line);

    if (lineOccurrence === occurrenceDate && !suppressed) return true;
  }
  return false;
}


async function hasActiveRoutineInstanceForDate(app,item){
  const file=app.vault.getAbstractFileByPath(item.filePath); if(!file)return false;
  const text=await app.vault.read(file); let current=null;
  for(const line of text.split('\n')){
    const h=line.trim().match(/^##\s+(\d{4}-\d{2}-\d{2})$/);
    if(h){current=h[1];continue;} if(/^##\s+/.test(line)){current=null;continue;}
    if(current!==item.date||!/^\- \[[ xX]\] /.test(line))continue;
    const rid=(line.match(/\[routineId::\s*([^\]]+)\]/)||[])[1]||null;
    const suppressed=/\[momoSuppressed::\s*true\]/.test(line);
    if(rid===item.routineId&&!suppressed)return true;
  }
  return false;
}
async function restoreSuppressedRoutineInstance(app,item){
  if(!item.routineId||!item.suppressed)return false;
  let restored=false;
  await mutateTextFile(app,item.filePath,text=>{
    const lines=text.split('\n');
    let idx=item.lineIndex;
    if(idx<0||lines[idx]!==item.raw) idx=lines.indexOf(item.raw);
    if(idx<0)return text;

    // Check inside the same serialized/atomic mutation. A pre-read check here
    // would reopen the race where routine maintenance inserts an occurrence
    // after the check but before this suppressed row is restored.
    let current=null;
    for(let i=0;i<lines.length;i++){
      if(i===idx) continue;
      const line=lines[i];
      const h=line.trim().match(/^##\s+(\d{4}-\d{2}-\d{2})$/);
      if(h){current=h[1];continue;}
      if(/^##\s+/.test(line)){current=null;continue;}
      if(current!==item.date||!/^\- \[[ xX]\] /.test(line))continue;
      const rid=(line.match(/\[routineId::\s*([^\]]+)\]/)||[])[1]||null;
      const suppressed=/\[momoSuppressed::\s*true\]/.test(line);
      if(rid===item.routineId&&!suppressed)return text;
    }

    lines[idx]=buildTaskLine(item,{suppressed:false,suppressedReason:null,movedFrom:null,done:false});
    restored=true;
    return lines.join('\n');
  });
  return restored;
}


async function syncRoutineLinkedInstances(app, previousRoutine, nextRoutine) {
  if (!previousRoutine?.id || !nextRoutine?.id || previousRoutine.id !== nextRoutine.id) return;
  const changed = previousRoutine.title !== nextRoutine.title ||
    previousRoutine.category !== nextRoutine.category ||
    previousRoutine.group !== nextRoutine.group ||
    previousRoutine.time !== nextRoutine.time;
  if (!changed) return;

  const prefix = `${DATA_FOLDER}/`;
  const files = app.vault.getFiles().filter(file =>
    file.path.startsWith(prefix) && file.path.endsWith('.md')
  );

  for (const file of files) {
    await mutateTextFile(app, file, text => {
      const lines = text.split('\n');
      let currentDate = null;
      let dirty = false;
      for (let i=0; i<lines.length; i++) {
        const line = lines[i];
        const h = line.trim().match(/^##\s+(\d{4}-\d{2}-\d{2})$/);
        if (h) { currentDate = h[1]; continue; }
        if (/^##\s+/.test(line)) { currentDate = null; continue; }
        if (!currentDate || !/^- \[[ xX]\] /.test(line)) continue;
        if (!line.includes(`[routineId:: ${nextRoutine.id}]`)) continue;
        const completed = /^- \[[xX]\] /.test(line) && !/\[momoSuppressed::\s*true\]/.test(line);
        if (completed) continue;
        const item = parseTaskLine(line, i, file.path, currentDate);
        if (!item) continue;
        const nextLine = item.occurrenceOverride
          ? line
          : buildTaskLine(item, {
              title: nextRoutine.title,
              category: nextRoutine.category || item.category,
              group: nextRoutine.group || '기타',
              time: nextRoutine.time || null
            });
        if (nextLine !== line) { lines[i] = nextLine; dirty = true; }
      }
      return dirty ? lines.join('\n') : text;
    });
  }
}

async function deleteRoutineInstances(app, routineId, mode) {
  const prefix = `${DATA_FOLDER}/`;
  const files = app.vault.getFiles().filter(file =>
    file.path.startsWith(prefix) && file.path.endsWith('.md')
  );

  for (const file of files) {
    await mutateTextFile(app, file, text => {
      const lines = text.split('\n');
      let changed = false;
      const next = [];
      for (const line of lines) {
        const isRoutineTask = line.includes(`[routineId:: ${routineId}]`) && /^- \[[ xX]\] /.test(line);
        if (!isRoutineTask) { next.push(line); continue; }
        const completed = /^- \[[xX]\] /.test(line);
        const shouldDelete = mode === 'all' || (mode === 'incomplete' && !completed);
        if (shouldDelete) { changed = true; continue; }
        next.push(line);
      }
      return changed ? next.join('\n') : text;
    });
  }
}

async function toggleTask(app,item,checked) {
  await mutateTextFile(app,item.filePath,text=>{
    const lines=text.split('\n');
    let idx=item.lineIndex;
    if(idx<0||lines[idx]!==item.raw) idx=lines.indexOf(item.raw);
    if(idx<0)return text;
    let line=lines[idx];
    if(checked) {
      line=line.replace(/^- \[ \] /,'- [x] ');
      if(!/✅\s*\d{4}-\d{2}-\d{2}/.test(line)) line += ` ✅ ${todaySeoul()}`;
    } else {
      line=line.replace(/^- \[[xX]\] /,'- [ ] ').replace(/\s*✅\s*\d{4}-\d{2}-\d{2}/g,'');
    }
    if(line===lines[idx])return text;
    lines[idx]=line;
    return lines.join('\n');
  });
}

function dailyToMonthlyBody(text) {
  const match = text.match(/^##\s+일기\s*\n([\s\S]*?)(?=^##\s+메모\s*$|\Z)/m);
  const memo = text.match(/^##\s+메모\s*\n([\s\S]*)$/m);
  const diaryBody = (match?.[1] || '').trim();
  const memoBody = (memo?.[1] || '').trim();
  return `### 일기\n${diaryBody}\n\n### 메모\n${memoBody}`.trimEnd();
}

function expectedRoutineStatus(routine, date, today, activeEnd, previewEnd) {
  if (!routine || routine.active === false || date < today || !routineMatchesDate(routine, date)) return null;
  const freq = routine.freq || 'daily';
  if (['daily','weekdays','weekends','weekly'].includes(freq)) {
    return date <= activeEnd ? 'active' : null;
  }
  if (['monthly','monthly-last','yearly'].includes(freq)) {
    if (date > previewEnd) return null;
    return date <= activeEnd ? 'active' : 'preview';
  }
  return null;
}

function getRoutineDatesInRange(routine, start, end) {
  const out = [];
  let d = start;
  while (d <= end) {
    if (routineMatchesDate(routine, d)) out.push(d);
    d = shiftDay(d, 1);
  }
  return out;
}

function routineMatchesDate(routine, date) {
  const dt = parseDate(date);
  const weekday = ((dt.getUTCDay() + 6) % 7) + 1; // 월=1 ... 일=7
  const day = dt.getUTCDate();
  const month = dt.getUTCMonth() + 1;
  const freq = routine.freq || 'daily';

  if (freq === 'daily') return true;
  if (freq === 'weekdays') return weekday >= 1 && weekday <= 5;
  if (freq === 'weekends') return weekday >= 6 && weekday <= 7;
  if (freq === 'weekly') return (routine.days || []).map(Number).includes(weekday);

  if (freq === 'monthly') {
    const wanted = Number(routine.dayOfMonth || 1);
    const last = new Date(Date.UTC(dt.getUTCFullYear(), month, 0)).getUTCDate();
    return day === Math.min(wanted, last);
  }

  if (freq === 'monthly-last') {
    const last = new Date(Date.UTC(dt.getUTCFullYear(), month, 0)).getUTCDate();
    return day === last;
  }

  if (freq === 'yearly') {
    const wantedMonth = Number(routine.monthOfYear || 1);
    if (month !== wantedMonth) return false;
    const wantedDay = Number(routine.dayOfMonth || 1);
    const last = new Date(Date.UTC(dt.getUTCFullYear(), month, 0)).getUTCDate();

    // 2/29 등 존재하지 않는 연도는 해당 월 말일로 보정합니다.
    return day === Math.min(wantedDay, last);
  }

  return false;
}

function groupBy(arr,keyFn){const m=new Map();for(const x of arr){const k=keyFn(x);if(!m.has(k))m.set(k,[]);m.get(k).push(x);}return m;}
function groupRank(cat,group){const p=GROUP_PRESETS[cat]||[];const i=p.indexOf(group);return i<0?(group==='기타'?998:500):i;}
function itemSorter(a,b){return (a.lineIndex ?? 0) - (b.lineIndex ?? 0);}
function todaySeoul(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function parseDate(s){const [y,m,d]=s.split('-').map(Number);return new Date(Date.UTC(y,m-1,d));}
function fmtDate(dt){return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,'0')}-${String(dt.getUTCDate()).padStart(2,'0')}`;}
function shiftDay(s,n){const d=parseDate(s);d.setUTCDate(d.getUTCDate()+n);return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;}
function shiftMonth(s,n){const [y,m,d]=s.split('-').map(Number);const first=new Date(Date.UTC(y,m-1+n,1));const yy=first.getUTCFullYear(),mm=first.getUTCMonth()+1;const max=new Date(Date.UTC(yy,mm,0)).getUTCDate();return `${yy}-${String(mm).padStart(2,'0')}-${String(Math.min(d,max)).padStart(2,'0')}`;}
function formatMonthTitle(year, month) {
  if (ACTIVE_LANGUAGE === 'en') return new Intl.DateTimeFormat('en-US',{year:'numeric',month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(year,month-1,1)));
  if (ACTIVE_LANGUAGE === 'ja') return `${year}年${month}月`;
  if (ACTIVE_LANGUAGE === 'zh') return `${year}年${month}月`;
  return `${year}년 ${month}월`;
}
function formatKoreanDate(s){
  const d=parseDate(s);
  const locale = ACTIVE_LANGUAGE === 'en' ? 'en-US' : ACTIVE_LANGUAGE === 'ja' ? 'ja-JP' : ACTIVE_LANGUAGE === 'zh' ? 'zh-CN' : 'ko-KR';
  return new Intl.DateTimeFormat(locale,{month:'long',day:'numeric',weekday:'short',timeZone:'UTC'}).format(d);
}
function escapeRegex(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
