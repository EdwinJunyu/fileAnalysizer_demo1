/** Bundled translations, ordered en-US, ja-JP, ko-KR, fr-FR, es-ES. Chinese source messages are stable catalogue keys. */
export const catalog: Record<string, readonly [string, string, string, string, string]> = {
  "频谱图，窄窗口可横向滚动查看完整坐标和色标": [
    "Spectrogram; in a narrow window, scroll horizontally to see all axes and the color scale",
    "スペクトログラム。狭いウィンドウでは横にスクロールすると、すべての目盛りとカラースケールを確認できます",
    "스펙트로그램. 창이 좁으면 가로로 스크롤하여 전체 축과 색상 눈금을 확인하세요",
    "Spectrogramme ; dans une fenêtre étroite, faites défiler horizontalement pour voir les axes et l’échelle de couleurs",
    "Espectrograma; en una ventana estrecha, desplázate horizontalmente para ver los ejes y la escala de colores completos"
  ],
  "时间（分:秒）": [
    "Time (min:sec)", "時間（分:秒）", "시간(분:초)", "Temps (min:s)", "Tiempo (min:s)"
  ],
  "操作未完成：{0}。请重试；已有结果仍保留。": [
    "The operation could not be completed: {0}. Try again; existing results are retained.",
    "操作を完了できませんでした：{0}。結果は保持されています。もう一度お試しください。",
    "작업을 완료하지 못했습니다: {0}. 기존 결과는 유지됩니다. 다시 시도하세요.",
    "Opération impossible : {0}. Réessayez ; les résultats existants sont conservés.",
    "No se pudo completar la operación: {0}. Vuelve a intentarlo; se conservan los resultados."
  ],
  "操作未完成，请查看提示后重试。": [
    "The operation could not be completed. Check the message and try again.",
    "操作を完了できませんでした。表示内容を確認して、もう一度お試しください。",
    "작업을 완료하지 못했습니다. 안내를 확인하고 다시 시도하세요.",
    "Opération impossible. Consultez le message et réessayez.",
    "No se pudo completar la operación. Consulta el mensaje y vuelve a intentarlo."
  ],
  "所选文件已在列表中。": [
    "The selected files are already in the list.",
    "選択したファイルはすでに一覧にあります。",
    "선택한 파일이 이미 목록에 있습니다.",
    "Les fichiers sélectionnés figurent déjà dans la liste.",
    "Los archivos seleccionados ya están en la lista."
  ],
  "已添加 {0} 个文件，开始解析。": [
    "Added {0} file. Starting analysis.¦Added {0} files. Starting analysis.",
    "{0} 件のファイルを追加しました。解析を開始します。",
    "파일 {0}개를 추가했습니다. 분석을 시작합니다.",
    "{0} fichier ajouté. Analyse en cours.¦{0} fichiers ajoutés. Analyse en cours.",
    "Se añadió {0} archivo. Iniciando el análisis.¦Se añadieron {0} archivos. Iniciando el análisis."
  ],
  "无法开始解析，请重试。": [
    "Could not start analysis. Try again.",
    "解析を開始できませんでした。もう一度お試しください。",
    "분석을 시작하지 못했습니다. 다시 시도하세요.",
    "Impossible de démarrer l’analyse. Réessayez.",
    "No se pudo iniciar el análisis. Vuelve a intentarlo."
  ],
  "已从列表移除 {0} 个文件，原文件保持不变。": [
    "Removed {0} file from the list. Original files are unchanged.¦Removed {0} files from the list. Original files are unchanged.",
    "一覧から {0} 件を削除しました。元のファイルは変更されません。",
    "목록에서 파일 {0}개를 제거했습니다. 원본 파일은 변경되지 않습니다.",
    "{0} fichier retiré de la liste. Les originaux sont inchangés.¦{0} fichiers retirés de la liste. Les originaux sont inchangés.",
    "Se quitó {0} archivo de la lista. Los originales no cambian.¦Se quitaron {0} archivos de la lista. Los originales no cambian."
  ],
  "重新解析 {0}。": [
    "Analyzing {0} again.",
    "{0} を再解析します。",
    "{0}을(를) 다시 분석합니다.",
    "Nouvelle analyse de {0}.",
    "Analizando {0} de nuevo."
  ],
  "无法重试，请再次尝试。": [
    "Could not retry. Try again.",
    "再試行できませんでした。もう一度お試しください。",
    "다시 시도하지 못했습니다. 한 번 더 시도하세요.",
    "Nouvelle tentative impossible. Réessayez.",
    "No se pudo reintentar. Vuelve a intentarlo."
  ],
  "{0}：解析失败，可重试。": [
    "{0}: analysis failed; you can retry.",
    "{0}：解析に失敗しました。再試行できます。",
    "{0}: 분석에 실패했습니다. 다시 시도할 수 있습니다.",
    "{0} : échec de l’analyse ; vous pouvez réessayer.",
    "{0}: el análisis falló; puedes reintentarlo."
  ],
  "正在生成 {0} 的音频轨道 #{1} 频谱。": [
    "Generating a spectrogram for {0}, audio track #{1}.",
    "{0} の音声トラック #{1} のスペクトログラムを生成しています。",
    "{0}의 오디오 트랙 #{1} 스펙트로그램을 생성하고 있습니다.",
    "Création du spectrogramme de {0}, piste audio nº {1}.",
    "Generando el espectrograma de {0}, pista de audio n.º {1}."
  ],
  "频谱生成已取消。": [
    "Spectrogram generation canceled.",
    "スペクトログラムの生成をキャンセルしました。",
    "스펙트로그램 생성을 취소했습니다.",
    "Création du spectrogramme annulée.",
    "Se canceló la generación del espectrograma."
  ],
  "{0} 的频谱已生成。": [
    "The spectrogram for {0} is ready.",
    "{0} のスペクトログラムを生成しました。",
    "{0}의 스펙트로그램이 생성되었습니다.",
    "Le spectrogramme de {0} est prêt.",
    "El espectrograma de {0} está listo."
  ],
  "频谱生成已取消": [
    "Spectrogram generation canceled",
    "スペクトログラムの生成をキャンセルしました",
    "스펙트로그램 생성을 취소했습니다",
    "Création du spectrogramme annulée",
    "Se canceló la generación del espectrograma"
  ],
  "{0} 的频谱生成已取消。": [
    "Spectrogram generation for {0} was canceled.",
    "{0} のスペクトログラム生成をキャンセルしました。",
    "{0}의 스펙트로그램 생성을 취소했습니다.",
    "Création du spectrogramme de {0} annulée.",
    "Se canceló el espectrograma de {0}."
  ],
  "{0} 的频谱未能生成，可重试。": [
    "Could not generate the spectrogram for {0}. You can retry.",
    "{0} のスペクトログラムを生成できませんでした。再試行できます。",
    "{0}의 스펙트로그램을 생성하지 못했습니다. 다시 시도할 수 있습니다.",
    "Impossible de créer le spectrogramme de {0}. Vous pouvez réessayer.",
    "No se pudo generar el espectrograma de {0}. Puedes reintentarlo."
  ],
  "取消未完成：{0}。请再次取消。": [
    "Cancellation failed: {0}. Try canceling again.",
    "キャンセルできませんでした：{0}。もう一度キャンセルしてください。",
    "취소하지 못했습니다: {0}. 다시 취소하세요.",
    "Annulation impossible : {0}. Réessayez d’annuler.",
    "No se pudo cancelar: {0}. Intenta cancelarlo de nuevo."
  ],
  "取消频谱生成未完成，请再次尝试。": [
    "Could not cancel spectrogram generation. Try again.",
    "スペクトログラム生成をキャンセルできませんでした。もう一度お試しください。",
    "스펙트로그램 생성을 취소하지 못했습니다. 다시 시도하세요.",
    "Impossible d’annuler la création du spectrogramme. Réessayez.",
    "No se pudo cancelar el espectrograma. Vuelve a intentarlo."
  ],
  "{0} 声道": [
    "{0} channel¦{0} channels",
    "{0} チャンネル",
    "{0}채널",
    "{0} canal¦{0} canaux",
    "{0} canal¦{0} canales"
  ],
  "音频轨道 #{0}{1}": [
    "Audio track #{0}{1}",
    "音声トラック #{0}{1}",
    "오디오 트랙 #{0}{1}",
    "Piste audio nº {0}{1}",
    "Pista de audio n.º {0}{1}"
  ],
  "音轨频谱": [
    "Audio spectrogram",
    "音声スペクトログラム",
    "오디오 스펙트로그램",
    "Spectrogramme audio",
    "Espectrograma de audio"
  ],
  "FFmpeg · 本机生成": [
    "FFmpeg · Generated locally",
    "FFmpeg・端末内で生成",
    "FFmpeg · 기기에서 생성",
    "FFmpeg · Créé localement",
    "FFmpeg · Generado localmente"
  ],
  "音频轨道": [
    "Audio track",
    "音声トラック",
    "오디오 트랙",
    "Piste audio",
    "Pista de audio"
  ],
  "已切换音频轨道，可生成此轨道的频谱。": [
    "Audio track changed. You can generate its spectrogram.",
    "音声トラックを切り替えました。スペクトログラムを生成できます。",
    "오디오 트랙을 변경했습니다. 스펙트로그램을 생성할 수 있습니다.",
    "Piste audio modifiée. Vous pouvez créer son spectrogramme.",
    "Pista de audio cambiada. Puedes generar su espectrograma."
  ],
  "重新生成": [
    "Generate again",
    "再生成",
    "다시 생성",
    "Recréer",
    "Generar de nuevo"
  ],
  "重试生成": [
    "Retry generation",
    "生成を再試行",
    "생성 다시 시도",
    "Réessayer",
    "Reintentar generación"
  ],
  "生成频谱": [
    "Generate spectrogram",
    "スペクトログラムを生成",
    "스펙트로그램 생성",
    "Créer le spectrogramme",
    "Generar espectrograma"
  ],
  "正在取消…": [
    "Canceling…",
    "キャンセル中…",
    "취소 중…",
    "Annulation…",
    "Cancelando…"
  ],
  "取消生成": [
    "Cancel generation",
    "生成をキャンセル",
    "생성 취소",
    "Annuler la création",
    "Cancelar generación"
  ],
  "尚未生成此音轨的频谱。": [
    "No spectrogram has been generated for this track.",
    "このトラックのスペクトログラムはまだ生成されていません。",
    "이 트랙의 스펙트로그램이 아직 없습니다.",
    "Aucun spectrogramme créé pour cette piste.",
    "Aún no se ha generado un espectrograma para esta pista."
  ],
  "正在取消生成，请稍候。": [
    "Canceling generation. Please wait.",
    "生成をキャンセルしています。しばらくお待ちください。",
    "생성을 취소하고 있습니다. 잠시 기다려 주세요.",
    "Annulation en cours. Veuillez patienter.",
    "Cancelando la generación. Espera un momento."
  ],
  "正在生成完整音轨频谱，长文件可能需要更长时间。": [
    "Generating the full-track spectrogram. Longer files may take more time.",
    "トラック全体のスペクトログラムを生成しています。長いファイルは時間がかかることがあります。",
    "전체 트랙의 스펙트로그램을 생성하고 있습니다. 긴 파일은 시간이 더 걸릴 수 있습니다.",
    "Création du spectrogramme complet. Les fichiers longs peuvent prendre plus de temps.",
    "Generando el espectrograma completo. Los archivos largos pueden tardar más."
  ],
  "频谱已生成。": [
    "Spectrogram ready.",
    "スペクトログラムを生成しました。",
    "스펙트로그램이 생성되었습니다.",
    "Spectrogramme prêt.",
    "Espectrograma listo."
  ],
  "未能生成频谱，可重试生成。": [
    "Could not generate the spectrogram. You can retry.",
    "スペクトログラムを生成できませんでした。再試行できます。",
    "스펙트로그램을 생성하지 못했습니다. 다시 시도할 수 있습니다.",
    "Création impossible. Vous pouvez réessayer.",
    "No se pudo generar el espectrograma. Puedes reintentarlo."
  ],
  "频谱生成已取消，可重试生成。": [
    "Generation canceled. You can retry.",
    "生成をキャンセルしました。再試行できます。",
    "생성을 취소했습니다. 다시 시도할 수 있습니다.",
    "Création annulée. Vous pouvez réessayer.",
    "Generación cancelada. Puedes reintentarlo."
  ],
  "正在生成{0}频谱；完成后可生成此音轨，也可切回该文件取消。": [
    "Generating a spectrogram for {0}. When it finishes, generate this track or return to the active file to cancel.",
    "{0} のスペクトログラムを生成しています。完了後にこのトラックを生成するか、処理中のファイルに戻ってキャンセルできます。",
    "{0}의 스펙트로그램을 생성 중입니다. 완료 후 이 트랙을 생성하거나 진행 중인 파일로 돌아가 취소하세요.",
    "Création du spectrogramme de {0}. Attendez la fin ou revenez au fichier actif pour annuler.",
    "Generando el espectrograma de {0}. Espera a que termine o vuelve al archivo activo para cancelarlo."
  ],
  "「{0}」的": [
    "“{0}”",
    "「{0}」",
    "“{0}”",
    "« {0} »",
    "«{0}»"
  ],
  "另一个文件的": [
    "another file",
    "別のファイル",
    "다른 파일",
    "un autre fichier",
    "otro archivo"
  ],
  "频率 Hz": [
    "Frequency (Hz)",
    "周波数（Hz）",
    "주파수(Hz)",
    "Fréquence (Hz)",
    "Frecuencia (Hz)"
  ],
  "{0}，音频轨道 #{1} 的频谱；横轴为时间，纵轴为频率，颜色表示信号强度。": [
    "Spectrogram of {0}, audio track #{1}. Time runs horizontally, frequency vertically, and color indicates signal strength.",
    "{0} の音声トラック #{1} のスペクトログラムです。横軸は時間、縦軸は周波数、色は信号の強さを示します。",
    "{0}, 오디오 트랙 #{1}의 스펙트로그램입니다. 가로축은 시간, 세로축은 주파수이며 색상은 신호 세기를 나타냅니다.",
    "Spectrogramme de {0}, piste nº {1}. Axe horizontal : temps ; vertical : fréquence ; couleur : intensité du signal.",
    "Espectrograma de {0}, pista n.º {1}. Eje horizontal: tiempo; vertical: frecuencia; color: intensidad de la señal."
  ],
  "点击“生成频谱”查看此音轨": [
    "Select “Generate spectrogram” to view this track.",
    "「スペクトログラムを生成」を選択してください。",
    "“스펙트로그램 생성”을 선택해 이 트랙을 확인하세요.",
    "Sélectionnez « Créer le spectrogramme » pour voir cette piste.",
    "Selecciona «Generar espectrograma» para ver esta pista."
  ],
  "时间（秒）": [
    "Time (seconds)",
    "時間（秒）",
    "시간(초)",
    "Temps (secondes)",
    "Tiempo (segundos)"
  ],
  "时间 0–{0} s；频率 0–{1} Hz，线性刻度。": [
    "Time 0–{0} s; frequency 0–{1} Hz, linear scale.",
    "時間 0～{0} 秒、周波数 0～{1} Hz（線形目盛）。",
    "시간 0–{0}초, 주파수 0–{1} Hz, 선형 눈금입니다.",
    "Temps 0–{0} s ; fréquence 0–{1} Hz, échelle linéaire.",
    "Tiempo 0–{0} s; frecuencia 0–{1} Hz, escala lineal."
  ],
  "横轴为时间（秒），纵轴为频率（Hz），均为线性刻度。": [
    "Horizontal axis: time (s). Vertical axis: frequency (Hz). Both use a linear scale.",
    "横軸は時間（秒）、縦軸は周波数（Hz）です。いずれも線形目盛です。",
    "가로축은 시간(초), 세로축은 주파수(Hz)입니다. 모두 선형 눈금입니다.",
    "Axe horizontal : temps (s). Axe vertical : fréquence (Hz). Échelles linéaires.",
    "Eje horizontal: tiempo (s). Eje vertical: frecuencia (Hz). Ambas escalas son lineales."
  ],
  "{0} 个声道合并显示。": [
    "{0} channels combined.",
    "{0} チャンネルをまとめて表示します。",
    "{0}개 채널을 합쳐 표시합니다.",
    "{0} canaux combinés.",
    "{0} canales combinados."
  ],
  "单声道显示。": [
    "Mono display.",
    "モノラル表示です。",
    "모노로 표시합니다.",
    "Affichage mono.",
    "Visualización mono."
  ],
  "多个声道合并显示。": [
    "Multiple channels combined.",
    "複数のチャンネルをまとめて表示します。",
    "여러 채널을 합쳐 표시합니다.",
    "Canaux combinés.",
    "Varios canales combinados."
  ],
  "{0}颜色表示信号强度，显示范围 −120 至 0 dBFS，暗为弱、亮为强。{1}频谱不能单独用于判断源文件是否真无损。": [
    "{0} Color indicates signal strength from −120 to 0 dBFS: dark is weak, bright is strong. {1} A spectrogram alone cannot establish whether a source is truly lossless.",
    "{0} 色は −120～0 dBFS の信号強度を示し、暗いほど弱く、明るいほど強くなります。{1} スペクトログラムだけでは音源が真に無損失かどうかは判定できません。",
    "{0} 색상은 −120~0 dBFS의 신호 세기를 나타내며 어두울수록 약하고 밝을수록 강합니다. {1} 스펙트로그램만으로 원본의 실제 무손실 여부를 판단할 수 없습니다.",
    "{0} La couleur indique l’intensité de −120 à 0 dBFS : sombre = faible, clair = forte. {1} Le spectrogramme seul ne prouve pas qu’une source est réellement sans perte.",
    "{0} El color indica la intensidad de −120 a 0 dBFS: oscuro = débil, claro = fuerte. {1} El espectrograma por sí solo no demuestra que el origen sea realmente sin pérdida."
  ],
  "从列表移除 {0}": [
    "Remove {0} from the list",
    "一覧から {0} を削除",
    "목록에서 {0} 제거",
    "Retirer {0} de la liste",
    "Quitar {0} de la lista"
  ],
  "{0} 个文件 · {1} 个已处理": [
    "{0} file · {1} processed¦{0} files · {1} processed",
    "{0} 件のファイル・{1} 件処理済み",
    "파일 {0}개 · 처리 완료 {1}개",
    "{0} fichier · {1} traité¦{0} fichiers · {1} traités",
    "{0} archivo · {1} procesado¦{0} archivos · {1} procesados"
  ],
  "添加文件后开始解析": [
    "Add files to start analysis",
    "ファイルを追加すると解析が始まります",
    "파일을 추가하면 분석이 시작됩니다",
    "Ajoutez des fichiers pour lancer l’analyse",
    "Añade archivos para iniciar el análisis"
  ],
  "{0} 个文件待完成": [
    "{0} file remaining¦{0} files remaining",
    "残り {0} 件",
    "남은 파일 {0}개",
    "{0} fichier restant¦{0} fichiers restants",
    "Queda {0} archivo¦Quedan {0} archivos"
  ],
  "本次解析已完成": [
    "Analysis complete",
    "解析が完了しました",
    "분석 완료",
    "Analyse terminée",
    "Análisis completado"
  ],
  "准备就绪": [
    "Ready",
    "準備完了",
    "준비됨",
    "Prêt",
    "Listo"
  ],
  "{0} 项参数": [
    "{0} parameter¦{0} parameters",
    "{0} 項目",
    "매개변수 {0}개",
    "{0} paramètre¦{0} paramètres",
    "{0} parámetro¦{0} parámetros"
  ],
  "{0}，可滚动查看": [
    "{0}, scroll to explore",
    "{0}（スクロールして表示）",
    "{0}, 스크롤하여 보기",
    "{0}, faites défiler pour consulter",
    "{0}, desplázate para ver más"
  ],
  "参数": [
    "Parameter",
    "パラメーター",
    "매개변수",
    "Paramètre",
    "Parámetro"
  ],
  "值": [
    "Value",
    "値",
    "값",
    "Valeur",
    "Valor"
  ],
  "来源": [
    "Source",
    "情報源",
    "출처",
    "Source",
    "Origen"
  ],
  "参数解释": [
    "About this parameter",
    "パラメーターの説明",
    "매개변수 설명",
    "À propos du paramètre",
    "Acerca del parámetro"
  ],
  "{0}：参数解释": [
    "{0}: about this parameter",
    "{0}：パラメーターの説明",
    "{0}: 매개변수 설명",
    "{0} : à propos du paramètre",
    "{0}: acerca del parámetro"
  ],
  "用途计算": [
    "Usage calculators",
    "用途に応じた計算",
    "용도별 계산",
    "Calculs pratiques",
    "Cálculos de uso"
  ],
  "根据参数估算": [
    "Estimates from parameters",
    "パラメーターから概算",
    "매개변수 기반 추정",
    "Estimations selon les paramètres",
    "Estimaciones según parámetros"
  ],
  "目标打印 DPI": [
    "Target print DPI",
    "印刷の目標 DPI",
    "목표 인쇄 DPI",
    "DPI d’impression cible",
    "DPI de impresión de destino"
  ],
  "计算尺寸": [
    "Calculate dimensions",
    "サイズを計算",
    "크기 계산",
    "Calculer les dimensions",
    "Calcular dimensiones"
  ],
  "默认 300 DPI 是计算条件，不是文件记录值。按每英寸像素数换算，不裁切、不放大；结果不保证实际印刷质量。": [
    "The default 300 DPI is a calculation input, not a recorded file value. Converts pixels per inch without cropping or resampling; print quality is not guaranteed.",
    "初期値の 300 DPI は計算条件であり、ファイルの記録値ではありません。切り抜きや画素数の変更は行わず、印刷品質を保証するものではありません。",
    "기본 300 DPI는 계산 조건이며 파일에 기록된 값이 아닙니다. 자르기나 리샘플링 없이 환산하며 인쇄 품질을 보장하지 않습니다.",
    "Les 300 DPI par défaut sont une hypothèse de calcul, pas une valeur du fichier. Conversion sans recadrage ni rééchantillonnage ; la qualité d’impression n’est pas garantie.",
    "Los 300 DPI predeterminados son un dato de cálculo, no un valor del archivo. Conversión sin recorte ni remuestreo; no garantiza la calidad de impresión."
  ],
  "公式：打印尺寸（cm）= 像素尺寸 ÷ 目标 DPI × 2.54。": [
    "Formula: print size (cm) = pixels ÷ target DPI × 2.54.",
    "計算式：印刷サイズ（cm）＝画素数 ÷ 目標 DPI × 2.54。",
    "공식: 인쇄 크기(cm) = 픽셀 수 ÷ 목표 DPI × 2.54.",
    "Formule : taille (cm) = pixels ÷ DPI cible × 2,54.",
    "Fórmula: tamaño (cm) = píxeles ÷ DPI de destino × 2,54."
  ],
  "条件已更改，请计算。": [
    "Inputs changed. Calculate again.",
    "条件が変更されました。再計算してください。",
    "조건이 변경되었습니다. 다시 계산하세요.",
    "Conditions modifiées. Recalculez.",
    "Las condiciones han cambiado. Calcula de nuevo."
  ],
  "暂无可用的打印尺寸。": [
    "Print dimensions are unavailable.",
    "印刷サイズを計算できません。",
    "인쇄 크기를 계산할 수 없습니다.",
    "Dimensions d’impression indisponibles.",
    "Dimensiones de impresión no disponibles."
  ],
  "按 {0} DPI：宽 {1} cm × 高 {2} cm": [
    "At {0} DPI: {1} cm wide × {2} cm high",
    "{0} DPI：幅 {1} cm × 高さ {2} cm",
    "{0} DPI: 너비 {1} cm × 높이 {2} cm",
    "À {0} DPI : largeur {1} cm × hauteur {2} cm",
    "A {0} DPI: ancho {1} cm × alto {2} cm"
  ],
  "PCM 数据量估算 · 音频轨道 #{0}": [
    "PCM size estimate · Audio track #{0}",
    "PCM データ量の概算・音声トラック #{0}",
    "PCM 용량 추정 · 오디오 트랙 #{0}",
    "Estimation PCM · Piste audio nº {0}",
    "Estimación PCM · Pista de audio n.º {0}"
  ],
  "每分钟约 {0}": [
    "About {0} per minute",
    "1 分あたり約 {0}",
    "분당 약 {0}",
    "Environ {0} par minute",
    "Aproximadamente {0} por minuto"
  ],
  "PCM 码率：{0} bit/s。": [
    "PCM bitrate: {0} bit/s.",
    "PCM ビットレート：{0} bit/s。",
    "PCM 비트레이트: {0} bit/s.",
    "Débit PCM : {0} bit/s.",
    "Tasa de bits PCM: {0} bit/s."
  ],
  "按该轨道记录的 {0} 秒估算：{1}。": [
    "Estimated for this track’s recorded duration of {0} s: {1}.",
    "このトラックに記録された長さ {0} 秒での概算：{1}。",
    "이 트랙에 기록된 길이 {0}초 기준 추정: {1}.",
    "Estimation pour la durée enregistrée de cette piste ({0} s) : {1}.",
    "Estimación para la duración registrada de esta pista ({0} s): {1}."
  ],
  "缺少可可靠计算的轨道时长，仅显示每分钟用量；不以容器时长代替。": [
    "No reliable track duration. Only the per-minute estimate is shown; container duration is not substituted.",
    "信頼できるトラックの長さがないため、1 分あたりの量のみ表示します。コンテナーの長さでは代用しません。",
    "신뢰할 수 있는 트랙 길이가 없어 분당 추정치만 표시합니다. 컨테이너 길이로 대체하지 않습니다.",
    "Durée de piste fiable indisponible. Seule l’estimation par minute est affichée, sans utiliser la durée du conteneur.",
    "No hay una duración de pista fiable. Solo se muestra la estimación por minuto, sin sustituirla por la duración del contenedor."
  ],
  "公式：采样率 × 位深 × 声道数 × 秒数 ÷ 8。假设参数恒定且采样紧密存储，不含文件头、对齐和元数据；不是当前压缩文件大小或质量评分。": [
    "Formula: sample rate × bit depth × channels × seconds ÷ 8. Assumes constant parameters and tightly packed samples, excluding headers, alignment and metadata. This is not the compressed file size or a quality score.",
    "計算式：サンプリング周波数 × ビット深度 × チャンネル数 × 秒数 ÷ 8。条件は一定、サンプルは隙間なく格納されると仮定し、ヘッダー・アラインメント・メタデータは含めません。圧縮ファイルのサイズや品質評価ではありません。",
    "공식: 샘플링 주파수 × 비트 깊이 × 채널 수 × 초 ÷ 8. 고정된 조건과 조밀한 저장을 가정하며 헤더, 정렬 및 메타데이터는 제외합니다. 압축 파일 크기나 품질 점수가 아닙니다.",
    "Formule : fréquence × profondeur × canaux × secondes ÷ 8. Paramètres constants et échantillons contigus supposés ; en-têtes, alignement et métadonnées exclus. Ce n’est ni la taille compressée ni une note de qualité.",
    "Fórmula: frecuencia de muestreo × profundidad × canales × segundos ÷ 8. Supone parámetros constantes y muestras contiguas; excluye cabeceras, alineación y metadatos. No es el tamaño comprimido ni una puntuación de calidad."
  ],
  "隐私元数据检查": [
    "Privacy metadata check",
    "プライバシー関連メタデータの確認",
    "개인정보 메타데이터 검사",
    "Vérification des métadonnées personnelles",
    "Revisión de metadatos personales"
  ],
  "本机只读检查": [
    "Local, read-only check",
    "端末内で読み取りのみ",
    "기기 내 읽기 전용 검사",
    "Vérification locale, en lecture seule",
    "Revisión local de solo lectura"
  ],
  "已检查支持的字段": [
    "Supported fields checked",
    "対応フィールドを確認済み",
    "지원 필드 검사 완료",
    "Champs pris en charge vérifiés",
    "Campos compatibles revisados"
  ],
  "检查不完整": [
    "Check incomplete",
    "確認は一部のみ",
    "검사 불완전",
    "Vérification incomplète",
    "Revisión incompleta"
  ],
  "未能检查": [
    "Could not check",
    "確認できませんでした",
    "검사할 수 없음",
    "Vérification impossible",
    "No se pudo revisar"
  ],
  "未支持此格式": [
    "Format not supported",
    "未対応の形式",
    "지원하지 않는 형식",
    "Format non pris en charge",
    "Formato no compatible"
  ],
  "{0} · {1} 项可能涉及隐私的记录": [
    "{0} · {1} potentially personal record¦{0} · {1} potentially personal records",
    "{0}・プライバシーに関係する可能性のある記録 {1} 件",
    "{0} · 개인정보가 포함될 수 있는 기록 {1}개",
    "{0} · {1} entrée potentiellement personnelle¦{0} · {1} entrées potentiellement personnelles",
    "{0} · {1} registro potencialmente personal¦{0} · {1} registros potencialmente personales"
  ],
  "在已读取的支持字段中未发现记录；这不代表文件不含隐私。": [
    "No records found in the supported fields that were read. This does not mean the file contains no private information.",
    "読み取った対応フィールドに記録は見つかりませんでした。ファイルに個人情報が含まれていないことを示すものではありません。",
    "읽어 들인 지원 필드에서 기록을 찾지 못했습니다. 파일에 개인정보가 없다는 뜻은 아닙니다.",
    "Aucune entrée trouvée dans les champs pris en charge lus. Cela ne signifie pas que le fichier ne contient aucune information personnelle.",
    "No se encontraron registros en los campos compatibles leídos. Esto no significa que el archivo no contenga información privada."
  ],
  "检查范围不足，无法据此判断文件是否包含隐私信息。": [
    "The check was too limited to determine whether personal information is present.",
    "確認範囲が十分でないため、個人情報が含まれているかどうかは判断できません。",
    "검사 범위가 충분하지 않아 개인정보 포함 여부를 판단할 수 없습니다.",
    "La vérification est trop limitée pour déterminer la présence de données personnelles.",
    "El alcance de la revisión es insuficiente para determinar si hay información personal."
  ],
  "查看发现的元数据（{0} 项）": [
    "View detected metadata ({0} record)¦View detected metadata ({0} records)",
    "検出したメタデータを表示（{0} 件）",
    "발견된 메타데이터 보기({0}개)",
    "Voir les métadonnées détectées ({0} entrée)¦Voir les métadonnées détectées ({0} entrées)",
    "Ver metadatos detectados ({0} registro)¦Ver metadatos detectados ({0} registros)"
  ],
  "可能涉及隐私的元数据": [
    "Potentially personal metadata",
    "プライバシーに関係する可能性のあるメタデータ",
    "개인정보가 포함될 수 있는 메타데이터",
    "Métadonnées potentiellement personnelles",
    "Metadatos potencialmente personales"
  ],
  "已检查来源：{0}。": [
    "Sources checked: {0}.",
    "確認した情報源：{0}。",
    "검사한 출처: {0}.",
    "Sources vérifiées : {0}.",
    "Orígenes revisados: {0}."
  ],
  "PDF 页面尺寸": [
    "PDF page dimensions",
    "PDF のページサイズ",
    "PDF 페이지 크기",
    "Dimensions des pages PDF",
    "Dimensiones de páginas PDF"
  ],
  "按 MediaBox 记录宽高，已计入 UserUnit；尺寸未应用旋转，未裁切到 CropBox，不代表打印机的可打印区域。": [
    "Dimensions use MediaBox with UserUnit scaling. Rotation and CropBox cropping are not applied; this is not the printer’s printable area.",
    "MediaBox の幅と高さに UserUnit を反映した値です。回転や CropBox の切り抜きは適用しておらず、プリンターの印刷可能領域とは異なります。",
    "MediaBox 크기에 UserUnit을 반영합니다. 회전과 CropBox 자르기는 적용하지 않으며 프린터의 인쇄 가능 영역을 뜻하지 않습니다.",
    "Dimensions MediaBox avec mise à l’échelle UserUnit. Rotation et recadrage CropBox non appliqués ; il ne s’agit pas de la zone imprimable.",
    "Dimensiones de MediaBox con escala UserUnit. No se aplican la rotación ni el recorte CropBox; no es el área imprimible de la impresora."
  ],
  "未读取到可展示的页面尺寸，请查看解析问题。": [
    "No page dimensions available. Check the analysis issues.",
    "表示できるページサイズを読み取れませんでした。解析の注意事項を確認してください。",
    "표시할 페이지 크기를 읽지 못했습니다. 분석 문제를 확인하세요.",
    "Dimensions des pages indisponibles. Consultez les problèmes d’analyse.",
    "No hay dimensiones de página disponibles. Consulta los problemas del análisis."
  ],
  "查看页面尺寸（已读取 {0} 页）": [
    "View page dimensions ({0} page read)¦View page dimensions ({0} pages read)",
    "ページサイズを表示（{0} ページ読取済み）",
    "페이지 크기 보기({0}페이지 읽음)",
    "Voir les dimensions ({0} page lue)¦Voir les dimensions ({0} pages lues)",
    "Ver dimensiones ({0} página leída)¦Ver dimensiones ({0} páginas leídas)"
  ],
  "PDF 逐页尺寸，可滚动查看": [
    "PDF page dimensions, scroll to explore",
    "PDF の各ページのサイズ（スクロールして表示）",
    "PDF 페이지별 크기, 스크롤하여 보기",
    "Dimensions des pages PDF, défilement possible",
    "Dimensiones de páginas PDF, desplázate para ver más"
  ],
  "PDF 逐页页面尺寸": [
    "PDF dimensions by page",
    "PDF の各ページのサイズ",
    "PDF 페이지별 크기",
    "Dimensions de chaque page PDF",
    "Dimensiones de cada página PDF"
  ],
  "页码": [
    "Page",
    "ページ",
    "페이지",
    "Page",
    "Página"
  ],
  "宽度": [
    "Width",
    "幅",
    "너비",
    "Largeur",
    "Ancho"
  ],
  "高度": [
    "Height",
    "高さ",
    "높이",
    "Hauteur",
    "Alto"
  ],
  "旋转": [
    "Rotation",
    "回転",
    "회전",
    "Rotation",
    "Rotación"
  ],
  "选择本地文件": [
    "Choose local files",
    "端末内のファイルを選択",
    "로컬 파일 선택",
    "Choisir des fichiers locaux",
    "Elegir archivos locales"
  ],
  "把文件拖到这里": [
    "Drop files here",
    "ここにファイルをドロップ",
    "여기에 파일을 놓으세요",
    "Déposez les fichiers ici",
    "Suelta los archivos aquí"
  ],
  "查看文件的编码、尺寸、时长和文档属性，也可以添加多个文件进行对比。": [
    "Inspect codecs, dimensions, duration and document properties. Add multiple files to compare them.",
    "コーデック、サイズ、長さ、文書属性を確認できます。複数のファイルを追加すると比較できます。",
    "코덱, 크기, 길이 및 문서 속성을 확인합니다. 여러 파일을 추가하면 비교할 수 있습니다.",
    "Consultez codecs, dimensions, durée et propriétés. Ajoutez plusieurs fichiers pour les comparer.",
    "Consulta códecs, dimensiones, duración y propiedades. Añade varios archivos para compararlos."
  ],
  "本地文件": [
    "Local file",
    "端末内のファイル",
    "로컬 파일",
    "Fichier local",
    "Archivo local"
  ],
  "重新解析": [
    "Analyze again",
    "再解析",
    "다시 분석",
    "Analyser à nouveau",
    "Analizar de nuevo"
  ],
  "文件位置": [
    "File location",
    "ファイルの場所",
    "파일 위치",
    "Emplacement du fichier",
    "Ubicación del archivo"
  ],
  "正在读取文件参数，仍可添加或切换文件。": [
    "Reading file parameters. You can still add or select files.",
    "ファイルのパラメーターを読み取っています。他のファイルを追加・選択できます。",
    "파일 매개변수를 읽고 있습니다. 파일을 추가하거나 선택할 수 있습니다.",
    "Lecture des paramètres. Vous pouvez toujours ajouter ou sélectionner des fichiers.",
    "Leyendo los parámetros. Puedes seguir añadiendo o seleccionando archivos."
  ],
  "等待前面的文件完成解析。": [
    "Waiting for earlier files to finish.",
    "先に追加したファイルの解析完了を待っています。",
    "앞선 파일의 분석이 끝나기를 기다리고 있습니다.",
    "En attente de la fin des fichiers précédents.",
    "Esperando a que terminen los archivos anteriores."
  ],
  "未能完成此文件的解析": [
    "Could not complete this file’s analysis",
    "このファイルの解析を完了できませんでした",
    "이 파일의 분석을 완료하지 못했습니다",
    "Impossible de terminer l’analyse du fichier",
    "No se pudo completar el análisis de este archivo"
  ],
  "部分信息需要留意": [
    "Some information needs attention",
    "確認が必要な情報があります",
    "확인이 필요한 정보가 있습니다",
    "Certains éléments nécessitent votre attention",
    "Hay información que requiere atención"
  ],
  "请检查解析工具是否已安装，以及启动应用时的工具路径配置，然后重新解析。": [
    "Check that the analysis tools are installed and their startup paths are configured, then analyze again.",
    "解析ツールのインストールと起動時のパス設定を確認して、再解析してください。",
    "분석 도구 설치와 시작 시 경로 설정을 확인한 후 다시 분석하세요.",
    "Vérifiez l’installation des outils et les chemins configurés au démarrage, puis relancez l’analyse.",
    "Comprueba la instalación y las rutas de las herramientas al inicio y vuelve a analizar."
  ],
  "可以检查文件是否仍存在、能否读取，或添加另一个文件。": [
    "Check that the file still exists and is readable, or add another file.",
    "ファイルが存在し、読み取れることを確認するか、別のファイルを追加してください。",
    "파일이 존재하고 읽을 수 있는지 확인하거나 다른 파일을 추가하세요.",
    "Vérifiez que le fichier existe et est lisible, ou ajoutez-en un autre.",
    "Comprueba que el archivo existe y se puede leer, o añade otro."
  ],
  "未读取到可用音轨，无法生成频谱；仍可查看视频参数。": [
    "No usable audio track found. A spectrogram cannot be generated; video parameters remain available.",
    "利用できる音声トラックがないため、スペクトログラムは生成できません。動画のパラメーターは確認できます。",
    "사용 가능한 오디오 트랙이 없어 스펙트로그램을 생성할 수 없습니다. 영상 매개변수는 볼 수 있습니다.",
    "Aucune piste audio exploitable. Spectrogramme impossible ; les paramètres vidéo restent disponibles.",
    "No hay una pista de audio utilizable. No se puede generar el espectrograma; los parámetros de vídeo siguen disponibles."
  ],
  "基础信息": [
    "Basic information",
    "基本情報",
    "기본 정보",
    "Informations générales",
    "Información básica"
  ],
  "文件参数": [
    "File parameters",
    "ファイルのパラメーター",
    "파일 매개변수",
    "Paramètres du fichier",
    "Parámetros del archivo"
  ],
  "视频轨道": [
    "Video track",
    "映像トラック",
    "비디오 트랙",
    "Piste vidéo",
    "Pista de vídeo"
  ],
  "字幕轨道": [
    "Subtitle track",
    "字幕トラック",
    "자막 트랙",
    "Piste de sous-titres",
    "Pista de subtítulos"
  ],
  "其他轨道": [
    "Other track",
    "その他のトラック",
    "기타 트랙",
    "Autre piste",
    "Otra pista"
  ],
  "{0} 已移到第 {1} 个文件列，共 {2} 列。": [
    "{0} moved to file column {1} of {2}.",
    "{0} を全 {2} 列中 {1} 番目のファイル列に移動しました。",
    "{0}을(를) 전체 {2}열 중 {1}번째 파일 열로 이동했습니다.",
    "{0} déplacé à la colonne de fichier {1} sur {2}.",
    "{0} se ha movido a la columna de archivo {1} de {2}."
  ],
  "{0} 个文件的参数对比": [
    "Parameter comparison for {0} files",
    "{0} 件のファイルのパラメーター比較",
    "파일 {0}개의 매개변수 비교",
    "Comparaison des paramètres de {0} fichiers",
    "Comparación de parámetros de {0} archivos"
  ],
  "比较当前列表中的文件。未记录与不适用分别标注，完整参数可在文件详情中查看。": [
    "Compare files in the current list. Missing and inapplicable values are distinct; view file details for all parameters.",
    "現在の一覧のファイルを比較します。未記録と対象外は区別して表示します。すべてのパラメーターはファイル詳細で確認できます。",
    "현재 목록의 파일을 비교합니다. 미기록과 해당 없음을 구분하며 전체 매개변수는 파일 상세에서 확인할 수 있습니다.",
    "Comparez les fichiers de la liste. Les valeurs absentes et non applicables sont distinguées ; les détails contiennent tous les paramètres.",
    "Compara los archivos de la lista. Se distinguen los valores no registrados y no aplicables; consulta los detalles para ver todos los parámetros."
  ],
  "拖动文件列的“拖动排序”调整顺序，也可点击左右箭头。键盘可用 Alt + ← / →。": [
    "Drag “Reorder” in a file header, use the arrow buttons, or press Alt + ← / → on the reorder control.",
    "列見出しの「並べ替え」をドラッグするか、左右のボタンを使って移動します。「並べ替え」にフォーカスして Alt + ← / → も使えます。",
    "파일 머리글의 “순서 변경”을 드래그하거나 좌우 버튼을 사용하세요. 순서 변경에 초점을 두고 Alt + ← / →도 사용할 수 있습니다.",
    "Faites glisser « Réordonner », utilisez les flèches ou Alt + ← / → sur la commande de réorganisation.",
    "Arrastra «Reordenar», usa las flechas o pulsa Alt + ← / → con el foco en el control de orden."
  ],
  "恢复添加顺序": [
    "Restore added order",
    "追加順に戻す",
    "추가 순서 복원",
    "Rétablir l’ordre d’ajout",
    "Restaurar orden de adición"
  ],
  "对比列已恢复为文件添加顺序。": [
    "File columns restored to the order they were added.",
    "ファイル列を追加順に戻しました。",
    "파일 열을 추가 순서로 복원했습니다.",
    "Colonnes rétablies dans l’ordre d’ajout.",
    "Se restauró el orden de adición de las columnas."
  ],
  "文件参数对比，可横向滚动": [
    "File parameter comparison, horizontal scrolling available",
    "ファイルのパラメーター比較（横スクロール可能）",
    "파일 매개변수 비교, 가로 스크롤 가능",
    "Comparaison des paramètres, défilement horizontal possible",
    "Comparación de parámetros, desplazamiento horizontal disponible"
  ],
  "当前列表的文件参数对比": [
    "Parameters of files in the current list",
    "現在の一覧のファイルパラメーター",
    "현재 목록의 파일 매개변수",
    "Paramètres des fichiers de la liste",
    "Parámetros de los archivos de la lista"
  ],
  "↔ 拖动排序": [
    "↔ Reorder",
    "↔ 並べ替え",
    "↔ 순서 변경",
    "↔ Réordonner",
    "↔ Reordenar"
  ],
  "拖动排序：{0} 列": [
    "Reorder: {0} column",
    "並べ替え：{0} 列",
    "순서 변경: {0} 열",
    "Réordonner : colonne {0}",
    "Reordenar: columna {0}"
  ],
  "正在移动 {0} 列，拖到目标列的左侧或右侧放下，按 Escape 取消。": [
    "Moving {0}. Drop before or after a target column; press Escape to cancel.",
    "{0} 列を移動しています。移動先の列の左右にドロップしてください。Escape キーでキャンセルできます。",
    "{0} 열을 이동 중입니다. 대상 열의 앞이나 뒤에 놓으세요. Escape 키로 취소합니다.",
    "Déplacement de {0}. Déposez avant ou après une colonne ; Échap pour annuler.",
    "Moviendo {0}. Suelta antes o después de una columna; pulsa Escape para cancelar."
  ],
  "左移 {0} 列": [
    "Move {0} column left",
    "{0} 列を左へ移動",
    "{0} 열을 왼쪽으로 이동",
    "Déplacer la colonne {0} à gauche",
    "Mover la columna {0} a la izquierda"
  ],
  "右移 {0} 列": [
    "Move {0} column right",
    "{0} 列を右へ移動",
    "{0} 열을 오른쪽으로 이동",
    "Déplacer la colonne {0} à droite",
    "Mover la columna {0} a la derecha"
  ],
  "添加多个文件可进行对比": [
    "Add multiple files to compare",
    "複数のファイルを追加すると比較できます",
    "여러 파일을 추가하면 비교할 수 있습니다",
    "Ajoutez plusieurs fichiers pour comparer",
    "Añade varios archivos para comparar"
  ],
  "当前列表可切换对比": [
    "Compare the current list",
    "現在の一覧を比較できます",
    "현재 목록을 비교할 수 있습니다",
    "Comparer la liste actuelle",
    "Comparar la lista actual"
  ],
  "File Analyzer · 文件参数": [
    "File Analyzer · File parameters",
    "File Analyzer・ファイルのパラメーター",
    "File Analyzer · 파일 매개변수",
    "File Analyzer · Paramètres des fichiers",
    "File Analyzer · Parámetros de archivos"
  ],
  "桌面连接未就绪，请重新启动应用。": [
    "Desktop connection unavailable. Restart the application.",
    "アプリとの接続を確立できませんでした。アプリを再起動してください。",
    "데스크톱 연결을 사용할 수 없습니다. 앱을 다시 시작하세요.",
    "Connexion à l’application indisponible. Redémarrez-la.",
    "La conexión con la aplicación no está disponible. Reiníciala."
  ],
  "页": [
    "page¦pages",
    "ページ",
    "페이지",
    "page¦pages",
    "página¦páginas"
  ],
  "词": [
    "word¦words",
    "語",
    "단어",
    "mot¦mots",
    "palabra¦palabras"
  ],
  "张": [
    "item¦items",
    "件",
    "개",
    "élément¦éléments",
    "elemento¦elementos"
  ],
  "字符": [
    "character¦characters",
    "文字",
    "자",
    "caractère¦caractères",
    "carácter¦caracteres"
  ],
  "段": [
    "paragraph¦paragraphs",
    "段落",
    "문단",
    "paragraphe¦paragraphes",
    "párrafo¦párrafos"
  ],
  "行": [
    "line¦lines",
    "行",
    "줄",
    "ligne¦lignes",
    "línea¦líneas"
  ],
  "无法确定": [
    "Unknown",
    "不明",
    "알 수 없음",
    "Indéterminé",
    "Desconocido"
  ],
  "未记录": [
    "Not recorded",
    "未記録",
    "기록 없음",
    "Non renseigné",
    "No registrado"
  ],
  "不适用": [
    "Not applicable",
    "対象外",
    "해당 없음",
    "Sans objet",
    "No aplicable"
  ],
  "解析错误": [
    "Parsing error",
    "解析エラー",
    "분석 오류",
    "Erreur d’analyse",
    "Error de análisis"
  ],
  "是": [
    "Yes",
    "はい",
    "예",
    "Oui",
    "Sí"
  ],
  "否": [
    "No",
    "いいえ",
    "아니요",
    "Non",
    "No"
  ],
  "音频": [
    "Audio",
    "音声",
    "오디오",
    "Audio",
    "Audio"
  ],
  "视频": [
    "Video",
    "動画",
    "비디오",
    "Vidéo",
    "Vídeo"
  ],
  "图片": [
    "Image",
    "画像",
    "이미지",
    "Image",
    "Imagen"
  ],
  "Office 文档": [
    "Office document",
    "Office 文書",
    "Office 문서",
    "Document Office",
    "Documento de Office"
  ],
  "PDF 文档": [
    "PDF document",
    "PDF 文書",
    "PDF 문서",
    "Document PDF",
    "Documento PDF"
  ],
  "其他文件": [
    "Other file",
    "その他のファイル",
    "기타 파일",
    "Autre fichier",
    "Otro archivo"
  ],
  "等待解析": [
    "Waiting",
    "解析待ち",
    "분석 대기",
    "En attente",
    "En espera"
  ],
  "解析中": [
    "Analyzing",
    "解析中",
    "분석 중",
    "Analyse en cours",
    "Analizando"
  ],
  "解析完成": [
    "Analysis complete",
    "解析完了",
    "분석 완료",
    "Analyse terminée",
    "Análisis completado"
  ],
  "部分解析": [
    "Partially analyzed",
    "一部解析",
    "부분 분석",
    "Analyse partielle",
    "Análisis parcial"
  ],
  "解析失败": [
    "Analysis failed",
    "解析失敗",
    "분석 실패",
    "Échec de l’analyse",
    "Análisis fallido"
  ],
  "{0}（首个音频轨道）": [
    "{0} (first audio track)",
    "{0}（最初の音声トラック）",
    "{0}(첫 번째 오디오 트랙)",
    "{0} (première piste audio)",
    "{0} (primera pista de audio)"
  ],
  "文件名": [
    "Filename",
    "ファイル名",
    "파일 이름",
    "Nom du fichier",
    "Nombre del archivo"
  ],
  "识别的文件类型": [
    "Detected file type",
    "検出したファイル形式",
    "감지된 파일 형식",
    "Type de fichier détecté",
    "Tipo de archivo detectado"
  ],
  "文件类别": [
    "File category",
    "ファイルの分類",
    "파일 분류",
    "Catégorie du fichier",
    "Categoría del archivo"
  ],
  "文件大小": [
    "File size",
    "ファイルサイズ",
    "파일 크기",
    "Taille du fichier",
    "Tamaño del archivo"
  ],
  "文件系统创建时间": [
    "Filesystem creation time",
    "ファイルシステムの作成日時",
    "파일 시스템 생성 시각",
    "Date de création du système de fichiers",
    "Fecha de creación del sistema de archivos"
  ],
  "文件系统修改时间": [
    "Filesystem modification time",
    "ファイルシステムの更新日時",
    "파일 시스템 수정 시각",
    "Date de modification du système de fichiers",
    "Fecha de modificación del sistema de archivos"
  ],
  "文件时长": [
    "File duration",
    "ファイルの長さ",
    "파일 재생 시간",
    "Durée du fichier",
    "Duración del archivo"
  ],
  "文件总码率": [
    "Total file bitrate",
    "ファイル全体のビットレート",
    "파일 전체 비트레이트",
    "Débit total du fichier",
    "Tasa de bits total del archivo"
  ],
  "编码格式（首个视频轨道优先，否则首个音频轨道）": [
    "Codec (first video track, otherwise first audio track)",
    "コーデック（最初の映像トラックを優先、なければ音声）",
    "코덱(첫 비디오 트랙 우선, 없으면 첫 오디오 트랙)",
    "Codec (première piste vidéo, sinon audio)",
    "Códec (primera pista de vídeo o, en su defecto, de audio)"
  ],
  "像素宽度（视频取首个视频轨道）": [
    "Pixel width (first video track for videos)",
    "ピクセル幅（動画は最初の映像トラック）",
    "픽셀 너비(영상은 첫 비디오 트랙)",
    "Largeur en pixels (première piste vidéo)",
    "Ancho en píxeles (primera pista de vídeo)"
  ],
  "像素高度（视频取首个视频轨道）": [
    "Pixel height (first video track for videos)",
    "ピクセル高さ（動画は最初の映像トラック）",
    "픽셀 높이(영상은 첫 비디오 트랙)",
    "Hauteur en pixels (première piste vidéo)",
    "Alto en píxeles (primera pista de vídeo)"
  ],
  "平均帧率（首个视频轨道）": [
    "Average frame rate (first video track)",
    "平均フレームレート（最初の映像トラック）",
    "평균 프레임률(첫 비디오 트랙)",
    "Cadence moyenne (première piste vidéo)",
    "Fotogramas por segundo de media (primera pista de vídeo)"
  ],
  "采样率": [
    "Sample rate",
    "サンプリング周波数",
    "샘플링 주파수",
    "Fréquence d’échantillonnage",
    "Frecuencia de muestreo"
  ],
  "声道数": [
    "Channel count",
    "チャンネル数",
    "채널 수",
    "Nombre de canaux",
    "Número de canales"
  ],
  "音频位深": [
    "Audio bit depth",
    "音声のビット深度",
    "오디오 비트 깊이",
    "Profondeur audio",
    "Profundidad de bits de audio"
  ],
  "编码是否无损": [
    "Lossless encoding",
    "無損失コーデック",
    "무손실 인코딩",
    "Encodage sans perte",
    "Codificación sin pérdida"
  ],
  "水平 DPI": [
    "Horizontal DPI",
    "水平方向の DPI",
    "수평 DPI",
    "DPI horizontal",
    "DPI horizontal"
  ],
  "垂直 DPI": [
    "Vertical DPI",
    "垂直方向の DPI",
    "수직 DPI",
    "DPI vertical",
    "DPI vertical"
  ],
  "图片位深": [
    "Image bit depth",
    "画像のビット深度",
    "이미지 비트 깊이",
    "Profondeur de l’image",
    "Profundidad de bits de imagen"
  ],
  "图片色彩空间/模式": [
    "Image color space/mode",
    "画像の色空間・モード",
    "이미지 색 공간/모드",
    "Espace colorimétrique/mode de l’image",
    "Espacio de color/modo de imagen"
  ],
  "保存的页数（可能过时）": [
    "Saved page count (may be outdated)",
    "保存されたページ数（古い可能性あり）",
    "저장된 페이지 수(오래된 값일 수 있음)",
    "Pages enregistrées (peut être obsolète)",
    "Páginas guardadas (puede estar desactualizado)"
  ],
  "保存的字数（可能过时）": [
    "Saved word count (may be outdated)",
    "保存された単語数（古い可能性あり）",
    "저장된 단어 수(오래된 값일 수 있음)",
    "Mots enregistrés (peut être obsolète)",
    "Palabras guardadas (puede estar desactualizado)"
  ],
  "工作表数量（含隐藏）": [
    "Worksheet count (including hidden)",
    "ワークシート数（非表示を含む）",
    "워크시트 수(숨김 포함)",
    "Feuilles (masquées incluses)",
    "Hojas de cálculo (incluidas las ocultas)"
  ],
  "幻灯片数量": [
    "Slide count",
    "スライド数",
    "슬라이드 수",
    "Nombre de diapositives",
    "Número de diapositivas"
  ],
  "PDF 页数": [
    "PDF page count",
    "PDF のページ数",
    "PDF 페이지 수",
    "Nombre de pages PDF",
    "Número de páginas PDF"
  ],
  "PDF 是否加密": [
    "PDF encrypted",
    "PDF の暗号化",
    "PDF 암호화 여부",
    "PDF chiffré",
    "PDF cifrado"
  ],
  "PDF 版本": [
    "PDF version",
    "PDF バージョン",
    "PDF 버전",
    "Version PDF",
    "Versión de PDF"
  ],
  "格式按文件内容识别，扩展名只作回退提示。容器格式与其中的音视频编码可能不同。": [
    "The type is detected from content; the extension is a fallback. A container format can differ from its audio/video codecs.",
    "形式は内容から判定し、拡張子は補助情報として使います。コンテナー形式と音声・映像のコーデックは異なる場合があります。",
    "파일 내용으로 형식을 감지하며 확장자는 보조 정보입니다. 컨테이너 형식과 내부 코덱은 다를 수 있습니다.",
    "Le type est détecté d’après le contenu ; l’extension sert de recours. Le conteneur peut différer des codecs audio/vidéo.",
    "El formato se detecta por el contenido; la extensión es una referencia secundaria. El contenedor puede diferir de los códecs de audio y vídeo."
  ],
  "文件在磁盘中的字节数，包含压缩数据、容器和元数据。1 KiB = 1024 byte，1 MiB = 1024 KiB。": [
    "On-disk bytes, including compressed data, container and metadata. 1 KiB = 1024 bytes; 1 MiB = 1024 KiB.",
    "圧縮データ、コンテナー、メタデータを含むディスク上のバイト数です。1 KiB = 1024 byte、1 MiB = 1024 KiB。",
    "압축 데이터, 컨테이너 및 메타데이터를 포함한 디스크상의 바이트 수입니다. 1 KiB = 1024 byte, 1 MiB = 1024 KiB.",
    "Octets sur disque, données compressées, conteneur et métadonnées compris. 1 KiB = 1024 octets ; 1 MiB = 1024 KiB.",
    "Bytes en disco, incluidos los datos comprimidos, el contenedor y los metadatos. 1 KiB = 1024 bytes; 1 MiB = 1024 KiB."
  ],
  "文件系统记录的创建时间。复制、下载或迁移可能改变它，不能据此确定作品的创作时间。": [
    "Creation time recorded by the filesystem. Copying, downloading or moving can change it; it does not establish when the work was created.",
    "ファイルシステムに記録された作成日時です。コピー、ダウンロード、移動で変わることがあり、作品の制作日時とは限りません。",
    "파일 시스템의 생성 시각입니다. 복사, 다운로드 또는 이동 시 바뀔 수 있으며 작품의 실제 제작 시각을 증명하지 않습니다.",
    "Création enregistrée par le système de fichiers. Copie, téléchargement ou déplacement peuvent la modifier ; ce n’est pas la date de création de l’œuvre.",
    "Creación registrada por el sistema de archivos. Puede cambiar al copiar, descargar o mover; no demuestra cuándo se creó el contenido."
  ],
  "文件系统记录的最后修改时间，与文档内部保存的修改时间可能不同。": [
    "Last modification time recorded by the filesystem. It can differ from the timestamp saved inside a document.",
    "ファイルシステムに記録された最終更新日時です。文書内部の更新日時とは異なる場合があります。",
    "파일 시스템의 마지막 수정 시각입니다. 문서 내부에 저장된 수정 시각과 다를 수 있습니다.",
    "Dernière modification du système de fichiers. Elle peut différer de la date enregistrée dans le document.",
    "Última modificación del sistema de archivos. Puede diferir de la fecha guardada dentro del documento."
  ],
  "容器报告的文件时长。各轨道可能有不同起点和长度，不能代替实际解码后的时长。": [
    "Duration reported by the container. Tracks may start at different times and have different lengths; this is not the fully decoded duration.",
    "コンテナーが報告する長さです。トラックごとに開始位置や長さが異なる場合があり、完全デコード後の長さを示すものではありません。",
    "컨테이너가 보고한 길이입니다. 트랙마다 시작 시각과 길이가 다를 수 있으며 전체 디코딩 후의 길이가 아닙니다.",
    "Durée indiquée par le conteneur. Les pistes peuvent avoir des débuts et durées différents ; ce n’est pas la durée entièrement décodée.",
    "Duración indicada por el contenedor. Las pistas pueden tener inicios y duraciones distintos; no es la duración tras decodificar todo el contenido."
  ],
  "当前轨道报告的时长。它可能与容器时长不同，也不代表已完成整条轨道的解码校验。": [
    "Duration reported by this track. It may differ from the container and does not mean the entire track was decoded and validated.",
    "このトラックが報告する長さです。コンテナーの長さと異なる場合があります。トラック全体のデコード検証が済んだことは示しません。",
    "이 트랙이 보고한 길이입니다. 컨테이너와 다를 수 있으며 전체 트랙을 디코딩해 검증했다는 뜻이 아닙니다.",
    "Durée indiquée par la piste. Elle peut différer du conteneur et ne signifie pas un décodage et une validation complets.",
    "Duración indicada por esta pista. Puede diferir del contenedor y no significa que se haya decodificado y validado toda la pista."
  ],
  "整个文件每秒的数据量，通常包含多个轨道及容器开销。码率高不一定意味着画质或音质更好。": [
    "Data per second for the entire file, usually including multiple tracks and container overhead. Higher bitrate does not necessarily mean better quality.",
    "通常は複数のトラックとコンテナーの付加情報を含む、ファイル全体の 1 秒あたりのデータ量です。高ビットレートでも高品質とは限りません。",
    "보통 여러 트랙과 컨테이너 부가 정보를 포함한 전체 파일의 초당 데이터량입니다. 높은 비트레이트가 높은 품질을 보장하지는 않습니다.",
    "Données par seconde du fichier entier, pistes et surcoût du conteneur compris. Un débit supérieur ne garantit pas une meilleure qualité.",
    "Datos por segundo del archivo completo, normalmente incluidas varias pistas y la sobrecarga del contenedor. Una tasa mayor no garantiza más calidad."
  ],
  "当前轨道每秒的数据量。可变码率内容的瞬时码率会变化，不能单凭码率判断质量。": [
    "Data per second for this track. Instantaneous bitrate can vary; bitrate alone does not establish quality.",
    "このトラックの 1 秒あたりのデータ量です。可変ビットレートでは瞬間的な値が変わるため、この値だけでは品質を判断できません。",
    "이 트랙의 초당 데이터량입니다. 순간 비트레이트는 변할 수 있으며 이 값만으로 품질을 판단할 수 없습니다.",
    "Données par seconde de cette piste. Le débit instantané peut varier ; il ne suffit pas pour juger la qualité.",
    "Datos por segundo de esta pista. La tasa instantánea puede variar; este valor por sí solo no determina la calidad."
  ],
  "编码决定数据如何压缩或存储，例如 FLAC、AAC、H.264。MP4、MKV 等容器可以容纳不同编码。": [
    "A codec defines compression or storage, such as FLAC, AAC or H.264. Containers such as MP4 and MKV can hold different codecs.",
    "FLAC、AAC、H.264 などのコーデックは圧縮・格納方式を定めます。MP4 や MKV などのコンテナーには異なるコーデックを格納できます。",
    "FLAC, AAC, H.264 같은 코덱은 압축 또는 저장 방식을 정합니다. MP4와 MKV 같은 컨테이너는 다양한 코덱을 담을 수 있습니다.",
    "Le codec définit la compression ou le stockage (FLAC, AAC, H.264). Les conteneurs MP4 ou MKV peuvent héberger plusieurs codecs.",
    "El códec define cómo se comprimen o almacenan los datos, como FLAC, AAC o H.264. MP4 y MKV pueden contener distintos códecs."
  ],
  "每秒每声道的采样次数，单位 Hz。48,000 Hz 表示每秒 48,000 次采样；提高采样率不会恢复已丢失的高频。": [
    "Samples per second per channel, in Hz. 48,000 Hz means 48,000 samples per second; increasing the rate cannot restore lost high frequencies.",
    "1 チャンネルの 1 秒あたりのサンプル数（Hz）です。48,000 Hz は毎秒 48,000 回の標本化を示します。数値を上げても失われた高音域は復元されません。",
    "채널당 초당 샘플 수(Hz)입니다. 48,000 Hz는 초당 48,000회 샘플링을 뜻합니다. 주파수를 높여도 손실된 고음역은 복원되지 않습니다.",
    "Échantillons par seconde et par canal (Hz). 48 000 Hz = 48 000 échantillons/s. Augmenter la fréquence ne restaure pas les hautes fréquences perdues.",
    "Muestras por segundo y canal, en Hz. 48.000 Hz son 48.000 muestras/s. Aumentar esta frecuencia no recupera las frecuencias altas perdidas."
  ],
  "PCM 每个采样的精度，影响可表示的动态范围。它不是码率；有损音频的解码格式不能证明原始位深。": [
    "Precision of each PCM sample, affecting representable dynamic range. It is not bitrate; a lossy decoder’s output format does not establish the original bit depth.",
    "PCM のサンプル精度で、表現できるダイナミックレンジに影響します。ビットレートとは異なり、非可逆圧縮のデコード形式から元のビット深度は判定できません。",
    "PCM 샘플의 정밀도이며 표현 가능한 동적 범위에 영향을 줍니다. 비트레이트와 다르며 손실 디코딩 형식으로 원래 비트 깊이를 증명할 수 없습니다.",
    "Précision des échantillons PCM, liée à la dynamique représentable. Ce n’est pas le débit ; la sortie d’un décodeur avec perte ne révèle pas la profondeur d’origine.",
    "Precisión de cada muestra PCM, que afecta al rango dinámico representable. No es la tasa de bits; la salida de un decodificador con pérdida no demuestra la profundidad original."
  ],
  "独立音频声道的数量，例如单声道为 1、立体声通常为 2。声道数不能单独说明具体的声道布局。": [
    "Number of independent audio channels: mono is 1 and stereo is usually 2. The count alone does not establish speaker layout.",
    "独立した音声チャンネルの数です。モノラルは 1、ステレオは通常 2 です。数だけでは具体的なスピーカー配置は分かりません。",
    "독립 오디오 채널 수입니다. 모노는 1, 스테레오는 보통 2입니다. 채널 수만으로 스피커 구성을 알 수 없습니다.",
    "Nombre de canaux indépendants : mono = 1, stéréo généralement = 2. Le nombre ne détermine pas la disposition des haut-parleurs.",
    "Número de canales de audio independientes: mono es 1 y estéreo suele ser 2. El número no determina la disposición de los altavoces."
  ],
  "声道在空间中的分配，例如左右声道或 5.1 环绕。声道数量相同也可能采用不同布局。": [
    "Spatial assignment of channels, such as left/right or 5.1 surround. Equal counts may use different layouts.",
    "左右や 5.1 サラウンドなど、チャンネルの空間的な配置です。チャンネル数が同じでも配置が異なる場合があります。",
    "좌우나 5.1 서라운드 같은 채널의 공간 배치입니다. 채널 수가 같아도 구성은 다를 수 있습니다.",
    "Répartition spatiale des canaux, par exemple gauche/droite ou 5.1. Un même nombre peut correspondre à plusieurs dispositions.",
    "Distribución espacial de canales, como izquierda/derecha o 5.1. El mismo número puede tener distintas disposiciones."
  ],
  "表示当前编码是否无损。FLAC 等无损编码无法证明音源此前没有经历有损压缩。": [
    "Whether the current codec is lossless. A lossless codec such as FLAC cannot prove the source was never compressed with loss.",
    "現在のコーデックが無損失かどうかを示します。FLAC などの無損失コーデックでも、音源が過去に非可逆圧縮されていないことは証明できません。",
    "현재 코덱의 무손실 여부입니다. FLAC 같은 무손실 코덱도 원본이 과거에 손실 압축되지 않았음을 증명하지 못합니다.",
    "Indique si le codec actuel est sans perte. Un codec comme FLAC ne prouve pas l’absence de compression avec perte antérieure.",
    "Indica si el códec actual es sin pérdida. Un códec como FLAC no demuestra que el origen nunca se comprimiera con pérdida."
  ],
  "画面水平方向的像素数量。对比视频时取首个非封面视频轨道；图片打印尺寸还取决于目标像素密度。": [
    "Horizontal pixel count. Video comparison uses the first non-cover video track. Printed image size also depends on target pixel density.",
    "横方向の画素数です。動画比較ではカバー画像以外の最初の映像トラックを使います。画像の印刷サイズは目標画素密度にも依存します。",
    "가로 픽셀 수입니다. 영상 비교에서는 표지가 아닌 첫 비디오 트랙을 사용합니다. 인쇄 크기는 목표 픽셀 밀도에도 좌우됩니다.",
    "Nombre de pixels horizontal. La comparaison vidéo utilise la première piste hors couverture. La taille imprimée dépend aussi de la densité cible.",
    "Número horizontal de píxeles. La comparación de vídeo usa la primera pista que no sea portada. El tamaño impreso también depende de la densidad elegida."
  ],
  "画面垂直方向的像素数量。对比视频时取首个非封面视频轨道；像素数量不等同于纸张上的厘米尺寸。": [
    "Vertical pixel count. Video comparison uses the first non-cover video track. Pixels are not physical centimeters on paper.",
    "縦方向の画素数です。動画比較ではカバー画像以外の最初の映像トラックを使います。画素数は紙上のセンチメートル寸法ではありません。",
    "세로 픽셀 수입니다. 영상 비교에서는 표지가 아닌 첫 비디오 트랙을 사용합니다. 픽셀 수는 종이상의 센티미터 크기가 아닙니다.",
    "Nombre de pixels vertical. Première piste vidéo hors couverture utilisée pour la comparaison. Les pixels ne sont pas des centimètres sur papier.",
    "Número vertical de píxeles. La comparación usa la primera pista que no sea portada. Los píxeles no son centímetros en el papel."
  ],
  "文件记录的水平物理分辨率。显示为 DPI；用于打印尺寸换算时按每英寸像素数理解。缺失或冲突时不假设为 72。": [
    "Recorded horizontal physical resolution, shown as DPI and interpreted as pixels per inch for print calculations. Missing or conflicting values are never assumed to be 72.",
    "ファイルに記録された水平方向の物理解像度です。DPI として表示し、印刷計算では 1 インチあたりの画素数として扱います。未記録や競合時に 72 を仮定しません。",
    "기록된 수평 물리 해상도로 DPI로 표시하며 인쇄 계산에서는 인치당 픽셀 수로 해석합니다. 값이 없거나 충돌해도 72로 가정하지 않습니다.",
    "Résolution physique horizontale enregistrée, en DPI, interprétée comme pixels/pouce pour l’impression. Aucune valeur de 72 supposée si elle manque ou est contradictoire.",
    "Resolución física horizontal registrada, mostrada como DPI e interpretada como píxeles por pulgada al calcular impresión. No se asume 72 si falta o hay conflicto."
  ],
  "文件记录的垂直物理分辨率。它可能与水平值不同；用途计算使用你明确输入的统一目标 DPI。": [
    "Recorded vertical physical resolution, which may differ from the horizontal value. Calculators use the single target DPI you explicitly enter.",
    "記録された垂直方向の物理解像度です。水平値とは異なる場合があります。用途計算には明示的に入力した単一の目標 DPI を使います。",
    "기록된 수직 물리 해상도이며 수평 값과 다를 수 있습니다. 계산에는 직접 입력한 단일 목표 DPI를 사용합니다.",
    "Résolution physique verticale, pouvant différer de l’horizontale. Le calcul utilise la valeur DPI unique saisie explicitement.",
    "Resolución física vertical, que puede diferir de la horizontal. El cálculo usa el único DPI de destino que introduces explícitamente."
  ],
  "图像采样的精度。具体是每通道还是整体位数，以字段来源和说明为准，不能直接当作音频位深。": [
    "Precision of image samples. Whether it is per channel or overall depends on the source and note; do not interpret it as audio bit depth.",
    "画像サンプルの精度です。チャンネルごとか全体かは情報源と注記で確認してください。音声のビット深度と同じものとして扱えません。",
    "이미지 샘플의 정밀도입니다. 채널별 값인지 전체 값인지는 출처와 설명을 확인하세요. 오디오 비트 깊이로 해석하면 안 됩니다.",
    "Précision des échantillons d’image. La source et la note indiquent si elle est par canal ou globale ; ce n’est pas la profondeur audio.",
    "Precisión de las muestras de imagen. La fuente y la nota indican si es por canal o global; no debe interpretarse como profundidad de audio."
  ],
  "描述颜色的表示方式。色彩空间名称并不能替代完整 ICC 配置和输出设备的色彩管理。": [
    "How colors are represented. A color-space name does not replace a full ICC profile or output-device color management.",
    "色の表現方式です。色空間の名前だけでは、ICC プロファイル全体や出力機器のカラーマネジメントの代わりにはなりません。",
    "색상을 표현하는 방식입니다. 색 공간 이름만으로 전체 ICC 프로필이나 출력 장치의 색 관리를 대체할 수 없습니다.",
    "Mode de représentation des couleurs. Le nom d’un espace ne remplace ni un profil ICC complet ni la gestion colorimétrique de sortie.",
    "Forma de representar colores. El nombre del espacio no sustituye un perfil ICC completo ni la gestión del color del dispositivo de salida."
  ],
  "视频画面的水平像素数量。实际显示比例还可能受到像素宽高比和旋转信息影响。": [
    "Horizontal pixels of the video image. Display aspect ratio may also depend on pixel aspect ratio and rotation metadata.",
    "動画の横方向の画素数です。実際の表示比率はピクセルの縦横比や回転情報にも影響されます。",
    "영상의 가로 픽셀 수입니다. 실제 표시 비율은 픽셀 종횡비와 회전 정보에도 영향을 받습니다.",
    "Pixels horizontaux de la vidéo. Le rapport d’affichage dépend aussi du rapport des pixels et de la rotation.",
    "Píxeles horizontales del vídeo. La proporción de visualización también depende de la relación de píxel y de la rotación."
  ],
  "视频画面的垂直像素数量。分辨率较高并不保证素材清晰，编码与源素材也会影响细节。": [
    "Vertical pixels of the video image. Higher resolution does not guarantee sharpness; encoding and source material also matter.",
    "動画の縦方向の画素数です。高解像度でも鮮明とは限りません。コーデックや元の素材も影響します。",
    "영상의 세로 픽셀 수입니다. 해상도가 높아도 선명함을 보장하지 않으며 인코딩과 원본 소재도 중요합니다.",
    "Pixels verticaux de la vidéo. Une résolution élevée ne garantit pas la netteté ; l’encodage et la source comptent aussi.",
    "Píxeles verticales del vídeo. Más resolución no garantiza nitidez; también influyen la codificación y el material original."
  ],
  "平均每秒帧数。可变帧率视频的帧间隔可能不同；平均帧率相同不代表时间节奏完全相同。": [
    "Average frames per second. Variable-frame-rate videos can have unequal frame intervals; equal averages do not imply identical timing.",
    "1 秒あたりの平均フレーム数です。可変フレームレートではフレーム間隔が変わるため、平均値が同じでも時間的な配置は同じとは限りません。",
    "초당 평균 프레임 수입니다. 가변 프레임률에서는 간격이 달라질 수 있어 평균값이 같아도 재생 타이밍이 같지는 않습니다.",
    "Images par seconde en moyenne. Les intervalles peuvent varier ; une même moyenne n’implique pas un rythme identique.",
    "Media de fotogramas por segundo. Los intervalos pueden variar; una media igual no implica tiempos idénticos."
  ],
  "视频颜色采样的精度。10 bit 能表示更多等级，但不能单凭位深确定 HDR 或实际画质。": [
    "Precision of video color samples. 10-bit offers more levels, but bit depth alone does not establish HDR or image quality.",
    "映像の色サンプルの精度です。10 bit はより多くの階調を表現できますが、ビット深度だけで HDR や実際の画質は判断できません。",
    "영상 색 샘플의 정밀도입니다. 10 bit는 더 많은 단계를 표현하지만 비트 깊이만으로 HDR이나 실제 화질을 판단할 수 없습니다.",
    "Précision des échantillons de couleur vidéo. Le 10 bits offre plus de niveaux, mais ne suffit pas à établir le HDR ou la qualité.",
    "Precisión de las muestras de color de vídeo. 10 bits ofrecen más niveles, pero la profundidad por sí sola no determina HDR ni calidad."
  ],
  "来自文档保存的页数统计，可能过时。本工具没有重新排版，换字体或纸张设置可能改变页数。": [
    "Saved document page statistics may be outdated. No layout engine is run; fonts and paper settings can change the page count.",
    "文書に保存されたページ数で、古い可能性があります。再レイアウトは行っていません。フォントや用紙設定でページ数が変わることがあります。",
    "문서에 저장된 페이지 통계로 오래된 값일 수 있습니다. 재배치하지 않으며 글꼴이나 용지 설정에 따라 페이지 수가 바뀔 수 있습니다.",
    "Nombre de pages enregistré, potentiellement obsolète. Aucune remise en page ; polices et papier peuvent modifier le total.",
    "Recuento de páginas guardado, que puede estar desactualizado. No se recompone el documento; las fuentes y el papel pueden cambiar el total."
  ],
  "来自文档保存的字数统计，可能过时；不同办公软件的统计口径也可能不同。": [
    "Saved document word statistics may be outdated. Different office applications can count words differently.",
    "文書に保存された単語数で、古い可能性があります。オフィスソフトによって数え方が異なる場合があります。",
    "문서에 저장된 단어 통계로 오래된 값일 수 있습니다. 프로그램마다 집계 방식이 다를 수 있습니다.",
    "Nombre de mots enregistré, potentiellement obsolète. Les applications bureautiques peuvent compter différemment.",
    "Recuento de palabras guardado, que puede estar desactualizado. Cada aplicación puede contar de forma distinta."
  ],
  "读取到的工作表数量，不代表每张表都有内容，也不能替代打印页数。": [
    "Number of worksheets read. It does not mean every sheet has content and is not a printed page count.",
    "読み取ったワークシートの数です。すべてのシートに内容があることは示さず、印刷ページ数でもありません。",
    "읽어 들인 워크시트 수입니다. 모든 시트에 내용이 있다는 뜻은 아니며 인쇄 페이지 수가 아닙니다.",
    "Nombre de feuilles lues. Elles ne contiennent pas forcément des données ; ce n’est pas un nombre de pages imprimées.",
    "Número de hojas leídas. No significa que todas tengan contenido ni equivale a páginas impresas."
  ],
  "读取到的幻灯片数量，不代表播放时一定展示全部页面。": [
    "Number of slides read. Not every slide is necessarily shown during playback.",
    "読み取ったスライドの数です。スライドショーですべて表示されるとは限りません。",
    "읽어 들인 슬라이드 수입니다. 재생 시 모든 슬라이드가 표시된다는 뜻은 아닙니다.",
    "Nombre de diapositives lues. Toutes ne sont pas forcément affichées lors de la présentation.",
    "Número de diapositivas leídas. No todas tienen que mostrarse durante la presentación."
  ],
  "页面结构解析成功时按页面树计数。加密或结构未读完时，可能只能显示工具报告值，请结合字段来源和解析问题。": [
    "When structural parsing succeeds, pages are counted from the page tree. Encrypted or incomplete reads may show only a tool-reported count; check the source and issues.",
    "構造解析に成功した場合はページツリーから集計します。暗号化や読み取り未完了時はツールの報告値のみの場合があるため、情報源と注意事項を確認してください。",
    "구조 분석 성공 시 페이지 트리에서 집계합니다. 암호화되었거나 읽기가 미완료면 도구 보고값만 표시될 수 있으니 출처와 문제를 확인하세요.",
    "Comptage via l’arbre des pages si l’analyse réussit. Sinon, notamment en cas de chiffrement, seul le total de l’outil peut être affiché ; consultez source et problèmes.",
    "Si el análisis estructural termina, se cuenta el árbol de páginas. Si está cifrado o incompleto, puede mostrarse solo el recuento de la herramienta; revisa el origen y los avisos."
  ],
  "表示检测到 PDF 的加密字典，不等同于必须输入打开密码。加密文档不解密页面结构，也不尝试绕过访问限制。": [
    "Indicates a PDF encryption dictionary, not necessarily a password required to open. Encrypted document structures are not decrypted and access restrictions are not bypassed.",
    "PDF の暗号化辞書の検出を示します。開く際のパスワードが必須とは限りません。暗号化された構造の復号やアクセス制限の回避は行いません。",
    "PDF 암호화 사전의 존재를 뜻하며 열기 암호가 필수라는 뜻은 아닙니다. 암호화된 구조를 복호화하거나 접근 제한을 우회하지 않습니다.",
    "Indique un dictionnaire de chiffrement PDF, pas nécessairement un mot de passe à l’ouverture. Aucun déchiffrement ni contournement des restrictions.",
    "Indica un diccionario de cifrado PDF, no necesariamente una contraseña de apertura. No se descifra la estructura ni se eluden restricciones de acceso."
  ],
  "PDF 格式的版本声明，不是创建应用版本，也不能据此判断文件安全性。": [
    "The declared PDF format version, not the application version. It does not establish file safety.",
    "PDF 形式の宣言バージョンです。作成アプリのバージョンではなく、ファイルの安全性を示すものでもありません。",
    "선언된 PDF 형식 버전이며 작성 프로그램 버전이 아닙니다. 파일 안전성을 판단할 수도 없습니다.",
    "Version déclarée du format PDF, pas celle de l’application. Elle ne garantit pas la sécurité du fichier.",
    "Versión declarada del formato PDF, no de la aplicación. No determina la seguridad del archivo."
  ],
  "PDF 文档属性中的作者，由文件生成者填写，可能过时或被修改。分享前可在隐私元数据检查中核对。": [
    "Author stored in PDF properties, entered by the producer and possibly outdated or edited. Review it in the privacy check before sharing.",
    "PDF の文書属性の作成者です。生成時に設定され、古い情報や変更済みの値の場合があります。共有前にプライバシー確認で内容を確認してください。",
    "PDF 속성의 작성자로 생성자가 입력하며 오래되었거나 변경된 값일 수 있습니다. 공유 전에 개인정보 검사에서 확인하세요.",
    "Auteur des propriétés PDF, renseigné par le créateur et potentiellement obsolète ou modifié. Vérifiez-le avant le partage.",
    "Autor guardado en las propiedades PDF, introducido por el generador y posiblemente desactualizado o modificado. Revísalo antes de compartir."
  ],
  "请输入 1 至 9600 之间的目标 DPI，可使用小数。": [
    "Enter a target DPI from 1 to 9600. Decimals are allowed.",
    "目標 DPI を 1～9600 の範囲で入力してください。小数も使えます。",
    "1~9600 사이의 목표 DPI를 입력하세요. 소수도 사용할 수 있습니다.",
    "Saisissez un DPI cible entre 1 et 9600. Les décimales sont acceptées.",
    "Introduce un DPI de destino entre 1 y 9600. Se admiten decimales."
  ],
  "未读取到有效的像素宽度和高度，无法换算打印尺寸。": [
    "Valid pixel width and height are unavailable, so print dimensions cannot be calculated.",
    "有効なピクセル幅と高さがないため、印刷サイズを計算できません。",
    "유효한 픽셀 너비와 높이가 없어 인쇄 크기를 계산할 수 없습니다.",
    "Largeur et hauteur en pixels valides indisponibles ; calcul impossible.",
    "No hay ancho y alto válidos en píxeles; no se puede calcular el tamaño de impresión."
  ],
  "仅音频轨道可估算 PCM 数据量。": [
    "PCM data size can only be estimated for audio tracks.",
    "PCM データ量の概算は音声トラックのみ対象です。",
    "PCM 데이터량은 오디오 트랙에서만 추정할 수 있습니다.",
    "L’estimation PCM concerne uniquement les pistes audio.",
    "Solo se puede estimar el tamaño PCM de pistas de audio."
  ],
  "缺少有效的采样率、位深或声道数，无法估算；不使用默认值替代。": [
    "Valid sample rate, bit depth or channel count is missing. No estimate is possible and no default is substituted.",
    "有効なサンプリング周波数、ビット深度、チャンネル数のいずれかがないため、概算できません。初期値では代用しません。",
    "유효한 샘플링 주파수, 비트 깊이 또는 채널 수가 없어 추정할 수 없습니다. 기본값으로 대체하지 않습니다.",
    "Fréquence, profondeur ou nombre de canaux valide manquant. Aucune estimation ni valeur par défaut substituée.",
    "Falta una frecuencia, profundidad o número de canales válido. No se puede estimar ni se sustituyen valores predeterminados."
  ],
  "参数超出可可靠计算的范围，无法估算。": [
    "Parameters exceed the reliable calculation range; no estimate is available.",
    "パラメーターが正確に計算できる範囲を超えているため、概算できません。",
    "매개변수가 신뢰할 수 있는 계산 범위를 벗어나 추정할 수 없습니다.",
    "Les paramètres dépassent la plage de calcul fiable ; estimation impossible.",
    "Los parámetros superan el rango de cálculo fiable; no se puede estimar."
  ],
  "路径不是普通文件。": [
    "The path is not a regular file.",
    "指定されたパスは通常のファイルではありません。",
    "경로가 일반 파일이 아닙니다.",
    "Le chemin ne désigne pas un fichier ordinaire.",
    "La ruta no corresponde a un archivo normal."
  ],
  "文件不存在。": [
    "File not found.",
    "ファイルが見つかりません。",
    "파일을 찾을 수 없습니다.",
    "Fichier introuvable.",
    "Archivo no encontrado."
  ],
  "没有权限读取文件。": [
    "Permission denied when reading the file.",
    "ファイルの読み取り権限がありません。",
    "파일을 읽을 권한이 없습니다.",
    "Accès en lecture refusé.",
    "No tienes permiso para leer el archivo."
  ],
  "文件未能读取，隐私元数据检查未完成。": [
    "The file could not be read. Privacy metadata was not checked.",
    "ファイルを読み取れなかったため、プライバシー関連メタデータの確認は完了していません。",
    "파일을 읽지 못해 개인정보 메타데이터 검사를 완료하지 못했습니다.",
    "Le fichier n’a pas pu être lu. Les métadonnées personnelles n’ont pas été vérifiées.",
    "No se pudo leer el archivo. No se revisaron los metadatos personales."
  ],
  "文件系统记录时间；不代表媒体或文档的原始创作时间。": [
    "Filesystem timestamp; not the original media or document creation time.",
    "ファイルシステムの記録日時です。メディアや文書の制作日時とは限りません。",
    "파일 시스템의 기록 시각이며 미디어나 문서의 원래 작성 시각이 아닙니다.",
    "Horodatage du système de fichiers, pas la date de création originale du contenu.",
    "Fecha del sistema de archivos; no es la fecha original de creación del contenido."
  ],
  "内容识别未完成：{0}": [
    "Content detection was incomplete: {0}",
    "内容による形式判定を完了できませんでした：{0}",
    "내용 감지를 완료하지 못했습니다: {0}",
    "Détection du contenu incomplète : {0}",
    "La detección del contenido no se completó: {0}"
  ],
  "仅依据扩展名，内容类型尚未验证。": [
    "Based on the extension only; content type is unverified.",
    "拡張子のみに基づく判定です。内容による形式確認は未完了です。",
    "확장자만으로 판단했으며 내용 형식은 확인되지 않았습니다.",
    "Déterminé uniquement par l’extension ; contenu non vérifié.",
    "Basado solo en la extensión; el tipo de contenido no está verificado."
  ],
  "MIME 类型": [
    "MIME type",
    "MIME タイプ",
    "MIME 형식",
    "Type MIME",
    "Tipo MIME"
  ],
  "扩展名 .{0} 与内容识别结果 {1} 不同，按实际内容解析。": [
    "Extension .{0} differs from detected content {1}. Analysis uses the content type.",
    "拡張子 .{0} は検出した内容 {1} と異なります。内容に基づいて解析します。",
    "확장자 .{0}이(가) 감지된 내용 {1}과 다릅니다. 실제 내용으로 분석합니다.",
    "L’extension .{0} diffère du contenu détecté {1}. L’analyse utilise le contenu.",
    "La extensión .{0} no coincide con el contenido {1}. Se analiza según el contenido."
  ],
  "解析范围": [
    "Analysis scope",
    "解析範囲",
    "분석 범위",
    "Portée de l’analyse",
    "Alcance del análisis"
  ],
  "基础文件信息": [
    "Basic file information",
    "基本ファイル情報",
    "기본 파일 정보",
    "Informations générales du fichier",
    "Información básica del archivo"
  ],
  "暂未支持此格式的专属参数；文件类型也可能尚未识别。": [
    "Specialized parameters are not supported for this format, or the type is not yet identified.",
    "この形式の専用パラメーターは未対応か、ファイル形式を識別できていません。",
    "이 형식의 전용 매개변수를 지원하지 않거나 형식을 식별하지 못했습니다.",
    "Paramètres spécifiques non pris en charge pour ce format, ou type non identifié.",
    "Este formato no admite parámetros específicos o aún no se ha identificado."
  ],
  "专属参数": [
    "Specialized parameters",
    "専用パラメーター",
    "전용 매개변수",
    "Paramètres spécifiques",
    "Parámetros específicos"
  ],
  "未记录可换算为英寸的物理单位": [
    "No physical unit recorded for conversion to inches",
    "インチに換算できる物理単位の記録なし",
    "인치로 환산할 물리 단위 기록 없음",
    "Unité physique convertible en pouces non renseignée",
    "Sin unidad física convertible a pulgadas"
  ],
  "由每米像素数 × 0.0254 换算": [
    "Converted from pixels per meter × 0.0254",
    "1 メートルあたりの画素数 × 0.0254 で換算",
    "미터당 픽셀 수 × 0.0254로 환산",
    "Conversion : pixels par mètre × 0,0254",
    "Conversión: píxeles por metro × 0,0254"
  ],
  "Photoshop ResolutionInfo 按像素/英寸记录": [
    "Photoshop ResolutionInfo, recorded in pixels/inch",
    "Photoshop ResolutionInfo（ピクセル/インチ）",
    "Photoshop ResolutionInfo, 픽셀/인치로 기록",
    "Photoshop ResolutionInfo, en pixels/pouce",
    "Photoshop ResolutionInfo, en píxeles/pulgada"
  ],
  "文件按像素/英寸记录": [
    "Recorded in pixels/inch",
    "ピクセル/インチで記録",
    "픽셀/인치로 기록",
    "Enregistré en pixels/pouce",
    "Registrado en píxeles/pulgada"
  ],
  "由每厘米像素数 × 2.54 换算": [
    "Converted from pixels per centimeter × 2.54",
    "1 センチメートルあたりの画素数 × 2.54 で換算",
    "센티미터당 픽셀 수 × 2.54로 환산",
    "Conversion : pixels par centimètre × 2,54",
    "Conversión: píxeles por centímetro × 2,54"
  ],
  "分辨率记录不是有效正数": [
    "Resolution is not a valid positive number",
    "解像度が有効な正数ではありません",
    "해상도가 유효한 양수가 아닙니다",
    "La résolution n’est pas un nombre positif valide",
    "La resolución no es un número positivo válido"
  ],
  "水平": [
    "Horizontal",
    "水平",
    "수평",
    "Horizontal",
    "Horizontal"
  ],
  "垂直": [
    "Vertical",
    "垂直",
    "수직",
    "Vertical",
    "Vertical"
  ],
  "文件未记录可用的物理分辨率，不使用默认 72 DPI": [
    "No usable physical resolution recorded; no 72 DPI default is assumed",
    "有効な物理解像度の記録なし。72 DPI を仮定しません",
    "유효한 물리 해상도 기록이 없어 72 DPI로 가정하지 않습니다",
    "Résolution physique non renseignée ; aucune valeur de 72 DPI supposée",
    "No hay resolución física utilizable; no se asumen 72 DPI"
  ],
  "分辨率来源冲突：{0}。未选择单一值": [
    "Conflicting resolution sources: {0}. No single value was selected",
    "解像度の情報源が競合しています：{0}。単一の値は選択していません",
    "해상도 출처가 충돌합니다: {0}. 단일 값을 선택하지 않았습니다",
    "Sources de résolution contradictoires : {0}. Aucune valeur unique retenue",
    "Fuentes de resolución en conflicto: {0}. No se eligió un único valor"
  ],
  "文件记录的名义打印分辨率，不代表画质": [
    "Nominal print resolution recorded in the file; not an image quality measure",
    "ファイルに記録された公称印刷解像度です。画質を示すものではありません",
    "파일에 기록된 명목 인쇄 해상도이며 화질을 뜻하지 않습니다",
    "Résolution d’impression nominale du fichier ; ne mesure pas la qualité",
    "Resolución nominal de impresión registrada; no mide la calidad"
  ],
  "另有无有效物理单位的记录，详见原始元数据": [
    "Other records lack valid physical units; see raw metadata",
    "有効な物理単位のない記録もあります。元のメタデータを参照してください",
    "유효한 물리 단위가 없는 기록도 있습니다. 원시 메타데이터를 확인하세요",
    "D’autres entrées n’ont pas d’unité physique valide ; voir les métadonnées brutes",
    "Otros registros carecen de unidades físicas válidas; consulta los metadatos originales"
  ],
  "透明通道/透明色": [
    "Alpha channel / transparent color",
    "アルファチャンネル・透明色",
    "알파 채널/투명색",
    "Canal alpha / couleur transparente",
    "Canal alfa / color transparente"
  ],
  "表示透明信息是否存在，不证明实际像素包含半透明内容": [
    "Indicates transparency metadata, not whether actual pixels contain semitransparent content",
    "透明情報の有無を示します。実際の画素に半透明があることを保証しません",
    "투명 정보의 존재 여부이며 실제 픽셀의 반투명 여부를 보장하지 않습니다",
    "Indique des données de transparence, pas la présence réelle de pixels semi-transparents",
    "Indica información de transparencia, no que existan píxeles semitransparentes"
  ],
  "像素宽度": [
    "Pixel width",
    "ピクセル幅",
    "픽셀 너비",
    "Largeur en pixels",
    "Ancho en píxeles"
  ],
  "像素高度": [
    "Pixel height",
    "ピクセル高さ",
    "픽셀 높이",
    "Hauteur en pixels",
    "Alto en píxeles"
  ],
  "位深": [
    "Bit depth",
    "ビット深度",
    "비트 깊이",
    "Profondeur de bits",
    "Profundidad de bits"
  ],
  "调色板索引位数": [
    "Palette index bits",
    "パレットインデックスのビット数",
    "팔레트 인덱스 비트 수",
    "Bits d’index de palette",
    "Bits del índice de paleta"
  ],
  "每通道位数；多个不同值按原始通道列出": [
    "Bits per channel; differing channel values are listed as recorded",
    "チャンネルごとのビット数です。異なる値は元のチャンネル順に表示します",
    "채널당 비트 수이며 다른 값은 원래 채널별로 표시합니다",
    "Bits par canal ; les valeurs différentes sont listées telles qu’enregistrées",
    "Bits por canal; se muestran los valores distintos tal como se registraron"
  ],
  "色彩空间/模式": [
    "Color space / mode",
    "色空間・モード",
    "색 공간/모드",
    "Espace colorimétrique / mode",
    "Espacio de color / modo"
  ],
  "ICC 配置描述": [
    "ICC profile description",
    "ICC プロファイルの説明",
    "ICC 프로필 설명",
    "Description du profil ICC",
    "Descripción del perfil ICC"
  ],
  "方向记录": [
    "Recorded orientation",
    "記録された向き",
    "기록된 방향",
    "Orientation enregistrée",
    "Orientación registrada"
  ],
  "ExifTool 数值代码；未对像素执行旋转": [
    "ExifTool numeric code; pixels have not been rotated",
    "ExifTool の数値コードです。画素自体は回転していません",
    "ExifTool 숫자 코드이며 픽셀을 회전하지 않았습니다",
    "Code numérique ExifTool ; pixels non pivotés",
    "Código numérico de ExifTool; los píxeles no se han girado"
  ],
  "作者": [
    "Author",
    "作成者",
    "작성자",
    "Auteur",
    "Autor"
  ],
  "文档创建时间": [
    "Document creation time",
    "文書の作成日時",
    "문서 생성 시각",
    "Date de création du document",
    "Fecha de creación del documento"
  ],
  "文档修改时间": [
    "Document modification time",
    "文書の更新日時",
    "문서 수정 시각",
    "Date de modification du document",
    "Fecha de modificación del documento"
  ],
  "最后修改者": [
    "Last modified by",
    "最終更新者",
    "마지막 수정자",
    "Dernière modification par",
    "Última modificación por"
  ],
  "创建应用": [
    "Creating application",
    "作成アプリケーション",
    "작성 프로그램",
    "Application de création",
    "Aplicación de creación"
  ],
  "应用版本": [
    "Application version",
    "アプリケーションのバージョン",
    "프로그램 버전",
    "Version de l’application",
    "Versión de la aplicación"
  ],
  "公司": [
    "Company",
    "会社",
    "회사",
    "Société",
    "Empresa"
  ],
  "修订记录": [
    "Revision",
    "改訂記録",
    "수정 기록",
    "Révision",
    "Revisión"
  ],
  "文档保存的统计属性，可能过时；未重新排版或计算": [
    "Saved document statistics may be outdated; no layout or recalculation is performed",
    "保存された統計値のため、古い可能性があります。再レイアウトや再計算は行っていません",
    "저장된 문서 통계는 오래된 값일 수 있습니다. 재배치나 재계산하지 않습니다",
    "Statistiques enregistrées potentiellement obsolètes ; aucune remise en page ni aucun recalcul",
    "Las estadísticas guardadas pueden estar desactualizadas; no se recalcula ni se ajusta la disposición"
  ],
  "保存的页数": [
    "Saved page count",
    "保存されたページ数",
    "저장된 페이지 수",
    "Nombre de pages enregistré",
    "Número de páginas guardado"
  ],
  "保存的字数": [
    "Saved word count",
    "保存された単語数",
    "저장된 단어 수",
    "Nombre de mots enregistré",
    "Número de palabras guardado"
  ],
  "保存的工作表数量": [
    "Saved worksheet count",
    "保存されたワークシート数",
    "저장된 워크시트 수",
    "Nombre de feuilles enregistré",
    "Número de hojas guardado"
  ],
  "保存的幻灯片数量": [
    "Saved slide count",
    "保存されたスライド数",
    "저장된 슬라이드 수",
    "Nombre de diapositives enregistré",
    "Número de diapositivas guardado"
  ],
  "保存的字符数": [
    "Saved character count",
    "保存された文字数",
    "저장된 문자 수",
    "Nombre de caractères enregistré",
    "Número de caracteres guardado"
  ],
  "保存的含空格字符数": [
    "Saved characters including spaces",
    "保存された文字数（空白を含む）",
    "저장된 공백 포함 문자 수",
    "Caractères enregistrés, espaces compris",
    "Caracteres guardados, incluidos espacios"
  ],
  "保存的段落数": [
    "Saved paragraph count",
    "保存された段落数",
    "저장된 문단 수",
    "Nombre de paragraphes enregistré",
    "Número de párrafos guardado"
  ],
  "保存的行数": [
    "Saved line count",
    "保存された行数",
    "저장된 줄 수",
    "Nombre de lignes enregistré",
    "Número de líneas guardado"
  ],
  "保存的隐藏幻灯片数量": [
    "Saved hidden slide count",
    "保存された非表示スライド数",
    "저장된 숨김 슬라이드 수",
    "Diapositives masquées enregistrées",
    "Diapositivas ocultas guardadas"
  ],
  "标题": [
    "Title",
    "タイトル",
    "제목",
    "Titre",
    "Título"
  ],
  "主题": [
    "Subject",
    "件名",
    "주제",
    "Objet",
    "Asunto"
  ],
  "描述": [
    "Description",
    "説明",
    "설명",
    "Description",
    "Descripción"
  ],
  "关键词": [
    "Keywords",
    "キーワード",
    "키워드",
    "Mots-clés",
    "Palabras clave"
  ],
  "ExifTool 报告无法解析的元数据": [
    "ExifTool reported unreadable metadata",
    "ExifTool が読み取れないメタデータを報告しました",
    "ExifTool에서 읽을 수 없는 메타데이터를 보고했습니다",
    "ExifTool signale des métadonnées illisibles",
    "ExifTool informó de metadatos ilegibles"
  ],
  "分辨率来源冲突": [
    "Conflicting resolution sources",
    "解像度の情報源が競合しています",
    "해상도 출처 충돌",
    "Sources de résolution contradictoires",
    "Fuentes de resolución en conflicto"
  ],
  "图片包含互相冲突的 DPI 元数据，详见字段来源和原始元数据": [
    "The image contains conflicting DPI metadata. See field sources and raw metadata.",
    "画像の DPI 情報が競合しています。フィールドの情報源と元のメタデータを参照してください。",
    "이미지의 DPI 메타데이터가 충돌합니다. 필드 출처와 원시 메타데이터를 확인하세요.",
    "Métadonnées DPI contradictoires. Consultez les sources et métadonnées brutes.",
    "La imagen contiene metadatos DPI en conflicto. Consulta las fuentes y los metadatos originales."
  ],
  "ExifTool 未返回有效 JSON 元数据": [
    "ExifTool did not return valid JSON metadata",
    "ExifTool が有効な JSON メタデータを返しませんでした",
    "ExifTool이 유효한 JSON 메타데이터를 반환하지 않았습니다",
    "ExifTool n’a pas renvoyé de métadonnées JSON valides",
    "ExifTool no devolvió metadatos JSON válidos"
  ],
  "ExifTool 未返回单个文件的 JSON 元数据记录": [
    "ExifTool did not return a single-file JSON metadata record",
    "ExifTool が単一ファイルの JSON メタデータを返しませんでした",
    "ExifTool이 단일 파일의 JSON 메타데이터를 반환하지 않았습니다",
    "ExifTool n’a pas renvoyé d’entrée JSON pour un fichier unique",
    "ExifTool no devolvió un registro JSON de un único archivo"
  ],
  "编码格式": [
    "Codec",
    "コーデック",
    "코덱",
    "Codec",
    "Códec"
  ],
  "编码说明": [
    "Codec description",
    "コーデックの説明",
    "코덱 설명",
    "Description du codec",
    "Descripción del códec"
  ],
  "编码配置": [
    "Codec profile",
    "コーデックのプロファイル",
    "코덱 프로필",
    "Profil du codec",
    "Perfil del códec"
  ],
  "轨道时长": [
    "Track duration",
    "トラックの長さ",
    "트랙 재생 시간",
    "Durée de la piste",
    "Duración de la pista"
  ],
  "轨道码率": [
    "Track bitrate",
    "トラックのビットレート",
    "트랙 비트레이트",
    "Débit de la piste",
    "Tasa de bits de la pista"
  ],
  "语言": [
    "Language",
    "言語",
    "언어",
    "Langue",
    "Idioma"
  ],
  "轨道标题": [
    "Track title",
    "トラックのタイトル",
    "트랙 제목",
    "Titre de la piste",
    "Título de la pista"
  ],
  "附加封面图": [
    "Attached cover image",
    "添付カバー画像",
    "첨부 표지 이미지",
    "Image de couverture jointe",
    "Imagen de portada adjunta"
  ],
  "声道布局": [
    "Channel layout",
    "チャンネル配置",
    "채널 구성",
    "Disposition des canaux",
    "Disposición de canales"
  ],
  "有损音轨的解码采样格式不等于原始位深。": [
    "Decoded sample format of lossy audio does not establish the original bit depth.",
    "非可逆圧縮音声のデコード形式は、元のビット深度を示すものではありません。",
    "손실 오디오의 디코딩 샘플 형식은 원래 비트 깊이를 나타내지 않습니다.",
    "Le format décodé d’un son avec perte ne révèle pas la profondeur d’origine.",
    "El formato de audio con pérdida decodificado no demuestra la profundidad original."
  ],
  "依据编码类型判断，不能证明音源未经历有损压缩。": [
    "Based on codec type; does not prove the source was never compressed with loss.",
    "コーデックの種類による判定です。音源が過去に非可逆圧縮されていないことは証明できません。",
    "코덱 종류로 판단하며 원본이 과거에 손실 압축되지 않았음을 증명하지 않습니다.",
    "Déterminé par le codec ; ne prouve pas l’absence de compression avec perte antérieure.",
    "Basado en el códec; no demuestra que el origen nunca tuviera compresión con pérdida."
  ],
  "解码采样格式": [
    "Decoded sample format",
    "デコード後のサンプル形式",
    "디코딩 샘플 형식",
    "Format d’échantillon décodé",
    "Formato de muestras decodificadas"
  ],
  "平均帧率": [
    "Average frame rate",
    "平均フレームレート",
    "평균 프레임률",
    "Cadence moyenne",
    "Fotogramas por segundo de media"
  ],
  "平均帧率；可变帧率视频的各帧间隔可能不同。": [
    "Average rate; variable-frame-rate videos may have unequal frame intervals.",
    "平均フレームレートです。可変フレームレートの動画では各フレームの間隔が異なることがあります。",
    "평균 프레임률이며 가변 프레임률 영상의 프레임 간격은 다를 수 있습니다.",
    "Cadence moyenne ; les intervalles peuvent varier dans une vidéo à cadence variable.",
    "Frecuencia media; los intervalos pueden variar en vídeos con frecuencia variable."
  ],
  "像素格式": [
    "Pixel format",
    "ピクセル形式",
    "픽셀 형식",
    "Format de pixel",
    "Formato de píxel"
  ],
  "色彩空间": [
    "Color space",
    "色空間",
    "색 공간",
    "Espace colorimétrique",
    "Espacio de color"
  ],
  "色彩原色": [
    "Color primaries",
    "原色",
    "색 원색",
    "Couleurs primaires",
    "Colores primarios"
  ],
  "记录的帧数": [
    "Recorded frame count",
    "記録されたフレーム数",
    "기록된 프레임 수",
    "Nombre d’images enregistré",
    "Número de fotogramas registrado"
  ],
  "ffprobe 未返回有效的 JSON 对象。": [
    "FFprobe did not return a valid JSON object.",
    "FFprobe が有効な JSON オブジェクトを返しませんでした。",
    "FFprobe가 유효한 JSON 객체를 반환하지 않았습니다.",
    "FFprobe n’a pas renvoyé d’objet JSON valide.",
    "FFprobe no devolvió un objeto JSON válido."
  ],
  "未读取到有效的媒体轨道。": [
    "No valid media tracks found.",
    "有効なメディアトラックを読み取れませんでした。",
    "유효한 미디어 트랙을 읽지 못했습니다.",
    "Aucune piste multimédia valide trouvée.",
    "No se encontraron pistas multimedia válidas."
  ],
  "容器格式": [
    "Container format",
    "コンテナー形式",
    "컨테이너 형식",
    "Format du conteneur",
    "Formato del contenedor"
  ],
  "容器说明": [
    "Container description",
    "コンテナーの説明",
    "컨테이너 설명",
    "Description du conteneur",
    "Descripción del contenedor"
  ],
  "媒体轨道数": [
    "Media track count",
    "メディアトラック数",
    "미디어 트랙 수",
    "Nombre de pistes",
    "Número de pistas multimedia"
  ],
  "艺术家": [
    "Artist",
    "アーティスト",
    "아티스트",
    "Artiste",
    "Artista"
  ],
  "专辑": [
    "Album",
    "アルバム",
    "앨범",
    "Album",
    "Álbum"
  ],
  "FFprobe 报告解析错误，已保留可读取的参数：{0}": [
    "FFprobe reported parsing issues; readable parameters were retained: {0}",
    "FFprobe が解析の問題を報告しました。読み取れたパラメーターは保持しています：{0}",
    "FFprobe에서 분석 문제를 보고했습니다. 읽은 매개변수는 유지됩니다: {0}",
    "FFprobe signale des erreurs ; les paramètres lisibles sont conservés : {0}",
    "FFprobe informó de errores; se conservaron los parámetros legibles: {0}"
  ],
  "无法读取 Office XML：{0}": [
    "Could not read Office XML: {0}",
    "Office XML を読み取れませんでした：{0}",
    "Office XML을 읽지 못했습니다: {0}",
    "Impossible de lire le XML Office : {0}",
    "No se pudo leer el XML de Office: {0}"
  ],
  "未能读取文档结构，不使用可能过时的保存统计值": [
    "Document structure unavailable; potentially outdated saved counts are not used",
    "文書構造を読み取れないため、古い可能性のある保存済み統計値では代用しません",
    "문서 구조를 읽지 못해 오래된 저장 통계로 대체하지 않습니다",
    "Structure du document indisponible ; les totaux enregistrés potentiellement obsolètes ne sont pas utilisés",
    "No se pudo leer la estructura; no se usan los recuentos guardados que podrían estar desactualizados"
  ],
  "Office 包缺少必要部件：{0}": [
    "Required Office part missing: {0}",
    "Office パッケージの必須部品がありません：{0}",
    "Office 필수 구성 요소가 없습니다: {0}",
    "Composant Office requis absent : {0}",
    "Falta un componente obligatorio de Office: {0}"
  ],
  "{0} 的{1}结构无效，无法计数": [
    "Invalid {1} structure in {0}; cannot count",
    "{0} の {1} 構造が無効なため、集計できません",
    "{0}의 {1} 구조가 잘못되어 개수를 셀 수 없습니다",
    "Structure {1} invalide dans {0} ; comptage impossible",
    "Estructura {1} no válida en {0}; no se puede contar"
  ],
  "按 workbook.xml 的 sheet 条目计数，包含隐藏工作表；未打开或计算单元格": [
    "Counted from workbook.xml sheet entries, including hidden sheets; cells are not opened or recalculated",
    "workbook.xml の sheet 要素を集計しています。非表示シートを含み、セルの読み込みや再計算は行いません",
    "workbook.xml의 sheet 항목을 계산하며 숨김 시트를 포함합니다. 셀을 열거나 재계산하지 않습니다",
    "Compté selon les entrées sheet de workbook.xml, feuilles masquées incluses ; cellules non ouvertes ni recalculées",
    "Recuento de entradas sheet en workbook.xml, incluidas las ocultas; no se abren ni recalculan celdas"
  ],
  "按 presentation.xml 的 sldId 条目计数，包含隐藏幻灯片；不计入母版和未引用部件": [
    "Counted from presentation.xml sldId entries, including hidden slides; masters and unreferenced parts are excluded",
    "presentation.xml の sldId 要素を集計しています。非表示スライドを含み、マスターや参照されていない部品は含めません",
    "presentation.xml의 sldId 항목을 계산하며 숨김 슬라이드를 포함합니다. 마스터와 참조되지 않은 요소는 제외합니다",
    "Compté selon les entrées sldId de presentation.xml, diapositives masquées incluses ; masques et éléments non référencés exclus",
    "Recuento de entradas sldId en presentation.xml, incluidas las ocultas; se excluyen patrones y elementos sin referencia"
  ],
  "GPS 纬度": [
    "GPS latitude",
    "GPS 緯度",
    "GPS 위도",
    "Latitude GPS",
    "Latitud GPS"
  ],
  "纬度方向": [
    "Latitude reference",
    "緯度の方位",
    "위도 방향",
    "Référence de latitude",
    "Referencia de latitud"
  ],
  "GPS 经度": [
    "GPS longitude",
    "GPS 経度",
    "GPS 경도",
    "Longitude GPS",
    "Longitud GPS"
  ],
  "经度方向": [
    "Longitude reference",
    "経度の方位",
    "경도 방향",
    "Référence de longitude",
    "Referencia de longitud"
  ],
  "GPS 位置": [
    "GPS position",
    "GPS 位置",
    "GPS 위치",
    "Position GPS",
    "Posición GPS"
  ],
  "GPS 坐标": [
    "GPS coordinates",
    "GPS 座標",
    "GPS 좌표",
    "Coordonnées GPS",
    "Coordenadas GPS"
  ],
  "GPS 海拔": [
    "GPS altitude",
    "GPS 高度",
    "GPS 고도",
    "Altitude GPS",
    "Altitud GPS"
  ],
  "海拔参考": [
    "Altitude reference",
    "高度の基準",
    "고도 기준",
    "Référence d’altitude",
    "Referencia de altitud"
  ],
  "GPS 记录日期": [
    "GPS date",
    "GPS 記録日",
    "GPS 기록 날짜",
    "Date GPS",
    "Fecha GPS"
  ],
  "GPS 记录时间": [
    "GPS time",
    "GPS 記録時刻",
    "GPS 기록 시각",
    "Heure GPS",
    "Hora GPS"
  ],
  "城市": [
    "City",
    "市区町村",
    "도시",
    "Ville",
    "Ciudad"
  ],
  "国家": [
    "Country",
    "国",
    "국가",
    "Pays",
    "País"
  ],
  "州或省": [
    "State or province",
    "州・都道府県",
    "주 또는 도",
    "État ou province",
    "Estado o provincia"
  ],
  "省份": [
    "Province",
    "都道府県",
    "도",
    "Province",
    "Provincia"
  ],
  "详细地点": [
    "Sublocation",
    "詳細な場所",
    "상세 위치",
    "Lieu précis",
    "Ubicación detallada"
  ],
  "署名或艺术家": [
    "Credit or artist",
    "クレジット・アーティスト",
    "크레딧 또는 아티스트",
    "Crédit ou artiste",
    "Crédito o artista"
  ],
  "创作者": [
    "Creator",
    "作成者",
    "제작자",
    "Créateur",
    "Creador"
  ],
  "署名": [
    "Byline",
    "署名",
    "서명",
    "Signature",
    "Firma"
  ],
  "版权声明": [
    "Copyright notice",
    "著作権表示",
    "저작권 고지",
    "Mention de copyright",
    "Aviso de derechos de autor"
  ],
  "权利声明": [
    "Rights statement",
    "権利に関する記述",
    "권리 고지",
    "Déclaration des droits",
    "Declaración de derechos"
  ],
  "所有者姓名": [
    "Owner name",
    "所有者名",
    "소유자 이름",
    "Nom du propriétaire",
    "Nombre del propietario"
  ],
  "相机所有者": [
    "Camera owner",
    "カメラの所有者",
    "카메라 소유자",
    "Propriétaire de l’appareil photo",
    "Propietario de la cámara"
  ],
  "经理": [
    "Manager",
    "管理者",
    "관리자",
    "Responsable",
    "Responsable"
  ],
  "联系邮箱": [
    "Contact email",
    "連絡先メールアドレス",
    "연락처 이메일",
    "Adresse e-mail de contact",
    "Correo de contacto"
  ],
  "创作者邮箱": [
    "Creator email",
    "作成者のメールアドレス",
    "제작자 이메일",
    "E-mail du créateur",
    "Correo del creador"
  ],
  "创作者电话": [
    "Creator phone",
    "作成者の電話番号",
    "제작자 전화번호",
    "Téléphone du créateur",
    "Teléfono del creador"
  ],
  "作曲者": [
    "Composer",
    "作曲者",
    "작곡가",
    "Compositeur",
    "Compositor"
  ],
  "编码者": [
    "Encoded by",
    "エンコード担当者",
    "인코딩 담당자",
    "Encodé par",
    "Codificado por"
  ],
  "设备品牌": [
    "Device make",
    "機器のメーカー",
    "기기 제조사",
    "Marque de l’appareil",
    "Marca del dispositivo"
  ],
  "设备型号": [
    "Device model",
    "機器のモデル",
    "기기 모델",
    "Modèle de l’appareil",
    "Modelo del dispositivo"
  ],
  "相机型号": [
    "Camera model",
    "カメラのモデル",
    "카메라 모델",
    "Modèle de l’appareil photo",
    "Modelo de la cámara"
  ],
  "设备序列号": [
    "Device serial number",
    "機器のシリアル番号",
    "기기 일련번호",
    "Numéro de série de l’appareil",
    "Número de serie del dispositivo"
  ],
  "机身序列号": [
    "Body serial number",
    "本体のシリアル番号",
    "본체 일련번호",
    "Numéro de série du boîtier",
    "Número de serie del cuerpo"
  ],
  "镜头序列号": [
    "Lens serial number",
    "レンズのシリアル番号",
    "렌즈 일련번호",
    "Numéro de série de l’objectif",
    "Número de serie del objetivo"
  ],
  "内部序列号": [
    "Internal serial number",
    "内部シリアル番号",
    "내부 일련번호",
    "Numéro de série interne",
    "Número de serie interno"
  ],
  "设备标识": [
    "Device identifier",
    "機器識別子",
    "기기 식별자",
    "Identifiant de l’appareil",
    "Identificador del dispositivo"
  ],
  "地理位置": [
    "Geographic location",
    "地理的位置",
    "지리적 위치",
    "Localisation géographique",
    "Ubicación geográfica"
  ],
  "作者、署名或联系信息": [
    "Author, credit or contact information",
    "作成者・クレジット・連絡先情報",
    "작성자, 크레딧 또는 연락처 정보",
    "Auteur, crédit ou coordonnées",
    "Autor, crédito o información de contacto"
  ],
  "设备型号或标识": [
    "Device model or identifier",
    "機器のモデル・識別子",
    "기기 모델 또는 식별자",
    "Modèle ou identifiant de l’appareil",
    "Modelo o identificador del dispositivo"
  ],
  "仅检查已读取的受支持元数据字段；未发现记录不代表文件不含隐私。未检查正文、图像内容、批注、附件和历史版本。": [
    "Only supported metadata fields already read are checked. No findings do not mean no private information. Body content, images, comments, attachments and historical versions are not checked.",
    "読み取れた対応メタデータのみ確認します。検出がなくても個人情報が含まれていないとは限りません。本文、画像内容、コメント、添付ファイル、過去の版は確認していません。",
    "읽어 들인 지원 메타데이터만 검사합니다. 발견된 항목이 없어도 개인정보가 없다는 뜻은 아닙니다. 본문, 이미지 내용, 주석, 첨부 및 이전 버전은 검사하지 않습니다.",
    "Seuls les champs de métadonnées pris en charge déjà lus sont vérifiés. L’absence de résultat ne signifie pas l’absence de données personnelles. Contenu, images, commentaires, pièces jointes et versions antérieures ne sont pas vérifiés.",
    "Solo se revisan los campos de metadatos compatibles ya leídos. No encontrar registros no implica ausencia de información privada. No se revisan contenido, imágenes, comentarios, adjuntos ni versiones anteriores."
  ],
  "值较长，显示内容已截断。": [
    "The value is long and has been truncated for display.",
    "値が長いため、表示を省略しています。",
    "값이 길어 표시 내용을 잘랐습니다.",
    "Valeur longue, tronquée à l’affichage.",
    "El valor es largo y se ha recortado para mostrarlo."
  ],
  "FFprobe 文件和轨道标签": [
    "FFprobe file and track tags",
    "FFprobe のファイル・トラックタグ",
    "FFprobe 파일 및 트랙 태그",
    "Tags de fichier et de pistes FFprobe",
    "Etiquetas de archivo y pista de FFprobe"
  ],
  "音视频仅检查 FFprobe 返回的标签，不覆盖全部厂商私有数据。": [
    "Audio/video checks cover only tags returned by FFprobe, not all proprietary vendor data.",
    "音声・動画では FFprobe が返したタグのみ確認し、メーカー独自のデータすべては対象にしていません。",
    "오디오와 비디오는 FFprobe가 반환한 태그만 검사하며 모든 제조사 전용 데이터를 포함하지는 않습니다.",
    "La vérification audio/vidéo couvre uniquement les tags FFprobe, pas toutes les données propriétaires des fabricants.",
    "La revisión de audio y vídeo solo incluye las etiquetas devueltas por FFprobe, no todos los datos privados de fabricantes."
  ],
  "ExifTool 元数据": [
    "ExifTool metadata",
    "ExifTool のメタデータ",
    "ExifTool 메타데이터",
    "Métadonnées ExifTool",
    "Metadatos de ExifTool"
  ],
  "Office 文档属性": [
    "Office document properties",
    "Office の文書属性",
    "Office 문서 속성",
    "Propriétés du document Office",
    "Propiedades del documento de Office"
  ],
  "PDF 文档属性": [
    "PDF document properties",
    "PDF の文書属性",
    "PDF 문서 속성",
    "Propriétés du document PDF",
    "Propiedades del documento PDF"
  ],
  "发现项较多、过长或结构无法展开，仅展示前 100 项及受限长度，检查范围不完整。": [
    "Some entries are numerous, too long or cannot be expanded. Only the first 100 entries and limited value lengths are displayed; the check is incomplete.",
    "項目数が多い、値が長い、または展開できない構造があります。先頭 100 件と長さを制限した値のみ表示しており、確認は一部のみです。",
    "항목이 많거나 길거나 구조를 펼칠 수 없습니다. 처음 100개와 제한된 길이만 표시하며 검사가 불완전합니다.",
    "Certaines entrées sont trop nombreuses, longues ou illisibles. Seules les 100 premières, de longueur limitée, sont affichées ; vérification incomplète.",
    "Algunos registros son numerosos, largos o no se pueden desplegar. Solo se muestran los primeros 100 y valores de longitud limitada; la revisión está incompleta."
  ],
  "解析工具未返回可检查的元数据，请查看解析问题并重试。": [
    "No metadata available for checking. Review the analysis issues and try again.",
    "確認可能なメタデータが返されませんでした。解析の注意事項を確認して再試行してください。",
    "검사 가능한 메타데이터가 없습니다. 분석 문제를 확인하고 다시 시도하세요.",
    "Aucune métadonnée vérifiable. Consultez les problèmes d’analyse et réessayez.",
    "No hay metadatos que revisar. Consulta los problemas del análisis y reinténtalo."
  ],
  "工具报告值；页面结构检查成功后使用结构计数": [
    "Tool-reported count; replaced by structural counting when available",
    "ツールの報告値です。構造確認に成功した場合は構造に基づく集計値を使います",
    "도구 보고값이며 구조 검사 성공 시 구조 집계값을 사용합니다",
    "Total signalé par l’outil, remplacé par le comptage structurel si disponible",
    "Recuento de la herramienta; se sustituye por el estructural cuando está disponible"
  ],
  "未读取到加密标签时，不能仅据此判断为未加密": [
    "An absent encryption tag alone does not establish that the file is unencrypted",
    "暗号化タグがないことだけでは、暗号化されていないとは判断できません",
    "암호화 태그가 없다는 이유만으로 암호화되지 않았다고 판단할 수 없습니다",
    "L’absence de tag de chiffrement ne prouve pas à elle seule l’absence de chiffrement",
    "La ausencia de una etiqueta de cifrado no demuestra que el archivo no esté cifrado"
  ],
  "PDF 生成程序": [
    "PDF producer",
    "PDF 生成ソフト",
    "PDF 생성 도구",
    "Logiciel producteur du PDF",
    "Generador de PDF"
  ],
  "ExifTool 报告 PDF 元数据读取不完整，隐私检查可能遗漏信息。": [
    "ExifTool reported incomplete PDF metadata. Privacy information may be missed.",
    "ExifTool が PDF メタデータの読み取り未完了を報告しました。プライバシー情報が見落とされる可能性があります。",
    "ExifTool에서 PDF 메타데이터 읽기 미완료를 보고했습니다. 개인정보를 놓칠 수 있습니다.",
    "ExifTool signale des métadonnées PDF incomplètes. Des données personnelles peuvent manquer.",
    "ExifTool informó de metadatos PDF incompletos. Puede omitirse información personal."
  ],
  "PDF 元数据读取失败。": [
    "Could not read PDF metadata.",
    "PDF のメタデータを読み取れませんでした。",
    "PDF 메타데이터를 읽지 못했습니다.",
    "Impossible de lire les métadonnées PDF.",
    "No se pudieron leer los metadatos PDF."
  ],
  "PDF 已加密，未解密页面结构；只能展示可读取的元数据。": [
    "This PDF is encrypted. Page structure was not decrypted; only readable metadata is shown.",
    "PDF は暗号化されています。ページ構造は復号せず、読み取れるメタデータのみ表示します。",
    "암호화된 PDF입니다. 페이지 구조를 복호화하지 않으며 읽을 수 있는 메타데이터만 표시합니다.",
    "Ce PDF est chiffré. Structure non déchiffrée ; seules les métadonnées lisibles sont affichées.",
    "Este PDF está cifrado. No se descifró la estructura; solo se muestran los metadatos legibles."
  ],
  "PDF 超过 512 MiB，未检查页面结构；可读取的元数据仍保留。": [
    "PDF exceeds 512 MiB. Page structure was not checked; readable metadata is retained.",
    "PDF が 512 MiB を超えています。ページ構造は確認せず、読み取れたメタデータを保持しています。",
    "PDF가 512 MiB를 초과합니다. 페이지 구조를 검사하지 않았으며 읽은 메타데이터는 유지됩니다.",
    "Le PDF dépasse 512 MiB. Structure non vérifiée ; métadonnées lisibles conservées.",
    "El PDF supera 512 MiB. No se revisó la estructura; se conservan los metadatos legibles."
  ],
  "PDF 页面结构超出解析内存预算，已停止结构检查；可读取的元数据仍保留。": [
    "PDF structure exceeded the parsing memory budget. Structural checking stopped; readable metadata is retained.",
    "PDF のページ構造が解析用メモリーの上限を超えたため、構造確認を停止しました。読み取れたメタデータは保持しています。",
    "PDF 구조가 분석 메모리 한도를 초과해 구조 검사를 중지했습니다. 읽은 메타데이터는 유지됩니다.",
    "La structure PDF dépasse le budget mémoire. Vérification arrêtée ; métadonnées lisibles conservées.",
    "La estructura PDF superó el presupuesto de memoria. Se detuvo la revisión; se conservan los metadatos legibles."
  ],
  "PDF 页面结构检查超时，已停止解析；可读取的元数据仍保留。": [
    "PDF structural checking timed out and was stopped; readable metadata is retained.",
    "PDF の構造確認がタイムアウトしたため停止しました。読み取れたメタデータは保持しています。",
    "PDF 구조 검사가 시간 초과로 중지되었습니다. 읽은 메타데이터는 유지됩니다.",
    "Délai de vérification PDF dépassé. Analyse arrêtée ; métadonnées lisibles conservées.",
    "La revisión estructural PDF agotó el tiempo y se detuvo; se conservan los metadatos legibles."
  ],
  "PDF 页面结构检查已取消。": [
    "PDF structural checking was canceled.",
    "PDF のページ構造確認をキャンセルしました。",
    "PDF 페이지 구조 검사를 취소했습니다.",
    "Vérification de la structure PDF annulée.",
    "Se canceló la revisión estructural PDF."
  ],
  "PDF 在检查期间发生变化，无法可靠检查页面结构，请重新解析。": [
    "The PDF changed during checking. Its structure could not be checked reliably; analyze again.",
    "確認中に PDF が変更されたため、構造を正確に確認できませんでした。再解析してください。",
    "검사 중 PDF가 변경되어 구조를 신뢰할 수 있게 확인하지 못했습니다. 다시 분석하세요.",
    "Le PDF a changé pendant la vérification. Structure non vérifiable de façon fiable ; relancez l’analyse.",
    "El PDF cambió durante la revisión. No se pudo revisar su estructura de forma fiable; analízalo de nuevo."
  ],
  "无法可靠读取 PDF 页面结构，文件可能损坏或超出解析器能力。": [
    "Could not reliably read PDF structure. The file may be damaged or unsupported by the parser.",
    "PDF のページ構造を正確に読み取れませんでした。ファイルの破損や、解析器が未対応の構造の可能性があります。",
    "PDF 구조를 신뢰할 수 있게 읽지 못했습니다. 파일이 손상되었거나 분석기가 지원하지 않을 수 있습니다.",
    "Structure PDF illisible de façon fiable. Le fichier peut être endommagé ou dépasser les capacités de l’analyseur.",
    "No se pudo leer la estructura PDF de forma fiable. El archivo puede estar dañado o superar las capacidades del analizador."
  ],
  "页面结构检查未完成": [
    "Page structure check incomplete",
    "ページ構造の確認は未完了",
    "페이지 구조 검사 미완료",
    "Vérification de structure incomplète",
    "Revisión estructural incompleta"
  ],
  "记录无法可靠解码": [
    "The record could not be decoded reliably",
    "記録を正確にデコードできませんでした",
    "기록을 신뢰할 수 있게 디코딩하지 못했습니다",
    "L’entrée ne peut pas être décodée de manière fiable",
    "No se pudo decodificar el registro de forma fiable"
  ],
  "第 {0} 页的尺寸或旋转无法可靠读取，已跳过此页并保留其他可用结果。": [
    "Could not read dimensions or rotation on page {0}. That page was skipped; other usable results are retained.",
    "{0} ページ目のサイズまたは回転を読み取れなかったため、そのページを省略しました。他の有効な結果は保持しています。",
    "{0}페이지의 크기 또는 회전을 읽지 못해 해당 페이지를 건너뛰었습니다. 다른 유효한 결과는 유지됩니다.",
    "Dimensions ou rotation illisibles à la page {0}. Page ignorée ; autres résultats utilisables conservés.",
    "No se pudieron leer las dimensiones o la rotación de la página {0}. Se omitió esa página y se conservaron los demás resultados."
  ],
  "仅检查前 200 页的尺寸；总页数单独显示。": [
    "Dimensions checked for the first 200 pages only; total page count is shown separately.",
    "サイズ確認は先頭 200 ページのみです。総ページ数は別に表示します。",
    "처음 200페이지의 크기만 검사하며 전체 페이지 수는 별도로 표시합니다.",
    "Dimensions vérifiées uniquement pour les 200 premières pages ; total affiché séparément.",
    "Solo se revisaron las dimensiones de las primeras 200 páginas; el total se muestra aparte."
  ],
  "部分 PDF 属性或页面尺寸无法可靠读取，已保留可用结果。": [
    "Some PDF properties or page dimensions could not be read reliably; usable results are retained.",
    "一部の PDF 属性またはページサイズを正確に読み取れませんでした。有効な結果は保持しています。",
    "일부 PDF 속성이나 페이지 크기를 신뢰할 수 있게 읽지 못했습니다. 유효한 결과는 유지됩니다.",
    "Certaines propriétés ou dimensions PDF sont illisibles de façon fiable ; résultats utilisables conservés.",
    "No se pudieron leer algunas propiedades o dimensiones PDF de forma fiable; se conservan los resultados útiles."
  ],
  "请选择有效的音频轨道。": [
    "Select a valid audio track.",
    "有効な音声トラックを選択してください。",
    "유효한 오디오 트랙을 선택하세요.",
    "Sélectionnez une piste audio valide.",
    "Selecciona una pista de audio válida."
  ],
  "频谱只能分析本地普通文件。": [
    "Spectrograms require a regular local file.",
    "スペクトログラムは端末内の通常ファイルのみ解析できます。",
    "스펙트로그램은 로컬 일반 파일만 분석할 수 있습니다.",
    "Le spectrogramme nécessite un fichier local ordinaire.",
    "El espectrograma requiere un archivo local normal."
  ],
  "无法可靠读取音频参数，请检查文件是否损坏。": [
    "Audio parameters could not be read reliably. Check whether the file is damaged.",
    "音声パラメーターを正確に読み取れませんでした。ファイルの破損を確認してください。",
    "오디오 매개변수를 신뢰할 수 있게 읽지 못했습니다. 파일 손상 여부를 확인하세요.",
    "Paramètres audio illisibles de façon fiable. Vérifiez si le fichier est endommagé.",
    "No se pudieron leer los parámetros de audio de forma fiable. Comprueba si el archivo está dañado."
  ],
  "所选轨道不是音频轨道，或已不存在。": [
    "The selected track is not audio or no longer exists.",
    "選択したトラックは音声ではないか、存在しなくなっています。",
    "선택한 트랙이 오디오가 아니거나 더 이상 존재하지 않습니다.",
    "La piste sélectionnée n’est pas audio ou n’existe plus.",
    "La pista seleccionada no es de audio o ya no existe."
  ],
  "无法确定该音轨的采样率或声道数，暂时无法生成频谱。": [
    "The track’s sample rate or channel count is unknown; a spectrogram cannot be generated.",
    "トラックのサンプリング周波数またはチャンネル数が不明なため、スペクトログラムを生成できません。",
    "트랙의 샘플링 주파수나 채널 수를 알 수 없어 스펙트로그램을 생성할 수 없습니다.",
    "Fréquence ou nombre de canaux indéterminé ; spectrogramme impossible.",
    "Se desconoce la frecuencia de muestreo o los canales; no se puede generar el espectrograma."
  ],
  "该音轨过长或声道过多，频谱内存预计超过 256 MiB。请先截取较短片段；文件参数仍可查看。": [
    "This track is too long or has too many channels; estimated spectrogram memory exceeds 256 MiB. Trim the audio first. File parameters remain available.",
    "トラックが長いかチャンネル数が多いため、推定メモリー量が 256 MiB を超えます。短い区間に切り出してください。ファイルのパラメーターは確認できます。",
    "트랙이 너무 길거나 채널이 많아 예상 메모리가 256 MiB를 초과합니다. 짧게 잘라 사용하세요. 파일 매개변수는 볼 수 있습니다.",
    "Piste trop longue ou trop de canaux : mémoire estimée supérieure à 256 MiB. Raccourcissez l’audio ; les paramètres restent disponibles.",
    "La pista es demasiado larga o tiene muchos canales: la memoria estimada supera 256 MiB. Recorta el audio; los parámetros siguen disponibles."
  ],
  "音轨中途改变了采样率、声道布局或采样格式，暂不支持生成完整频谱。请先统一音轨参数后重试；文件参数仍可查看。": [
    "Sample rate, layout or format changed during the track; a complete spectrogram is not supported. Make the parameters consistent and retry. File parameters remain available.",
    "トラックの途中で周波数、チャンネル配置、サンプル形式が変わったため、全体のスペクトログラムに対応していません。条件を統一して再試行してください。パラメーターは確認できます。",
    "트랙 중간에 주파수, 채널 구성 또는 샘플 형식이 바뀌어 전체 스펙트로그램을 지원하지 않습니다. 조건을 통일해 다시 시도하세요. 파일 매개변수는 볼 수 있습니다.",
    "Fréquence, disposition ou format changeant dans la piste : spectrogramme complet non pris en charge. Uniformisez les paramètres et réessayez ; les paramètres du fichier restent disponibles.",
    "La frecuencia, disposición o formato cambia durante la pista: no se admite un espectrograma completo. Unifica los parámetros y reinténtalo; los parámetros siguen disponibles."
  ],
  "无法确认频谱覆盖的实际音频时长。": [
    "Could not confirm the spectrogram’s actual audio duration.",
    "スペクトログラムが対象とする実際の音声の長さを確認できませんでした。",
    "스펙트로그램의 실제 오디오 길이를 확인하지 못했습니다.",
    "Impossible de confirmer la durée audio réelle du spectrogramme.",
    "No se pudo confirmar la duración real de audio del espectrograma."
  ],
  "该音轨实际解码数据超过 256 MiB。请先截取较短片段；文件参数仍可查看。": [
    "Decoded track data exceeds 256 MiB. Trim the audio first; file parameters remain available.",
    "トラックのデコードデータが 256 MiB を超えます。短い区間に切り出してください。ファイルのパラメーターは確認できます。",
    "디코딩 데이터가 256 MiB를 초과합니다. 짧게 잘라 사용하세요. 파일 매개변수는 볼 수 있습니다.",
    "Les données décodées dépassent 256 MiB. Raccourcissez l’audio ; les paramètres restent disponibles.",
    "Los datos decodificados superan 256 MiB. Recorta el audio; los parámetros siguen disponibles."
  ],
  "频谱图像超过允许大小。": [
    "The spectrogram image exceeds the allowed size.",
    "スペクトログラム画像がサイズの上限を超えています。",
    "스펙트로그램 이미지가 크기 한도를 초과합니다.",
    "L’image du spectrogramme dépasse la taille autorisée.",
    "La imagen del espectrograma supera el tamaño permitido."
  ],
  "FFmpeg 未生成有效的频谱图像。": [
    "FFmpeg did not produce a valid spectrogram image.",
    "FFmpeg が有効なスペクトログラム画像を生成しませんでした。",
    "FFmpeg가 유효한 스펙트로그램 이미지를 생성하지 않았습니다.",
    "FFmpeg n’a pas produit de spectrogramme valide.",
    "FFmpeg no generó una imagen de espectrograma válida."
  ],
  "单个文档最大 512 MiB，音视频最大 2 GiB（按 1024 进制）。": [
    "Per-file limit: documents 512 MiB; audio/video 2 GiB (base 1024).",
    "1 ファイルの上限：文書 512 MiB、音声・動画 2 GiB（1024 進法）。",
    "파일당 한도: 문서 512 MiB, 오디오·비디오 2 GiB(1024 기준).",
    "Limite par fichier : documents 512 MiB ; audio/vidéo 2 GiB (base 1024).",
    "Límite por archivo: documentos 512 MiB; audio/vídeo 2 GiB (base 1024)."
  ],
  "{0}文件超过单个文件 {1} 的大小上限，未执行专属解析。请缩小文件后重新解析；基础文件信息仍可查看。": [
    "{0} file exceeds the per-file limit of {1}; specialized analysis was not run. Reduce the file size and analyze again. Basic information remains available.",
    "{0}ファイルが 1 ファイルの上限 {1} を超えたため、専用解析は行っていません。サイズを小さくして再解析してください。基本情報は確認できます。",
    "{0} 파일이 파일당 {1} 한도를 초과해 전용 분석을 실행하지 않았습니다. 크기를 줄여 다시 분석하세요. 기본 정보는 볼 수 있습니다.",
    "Le fichier {0} dépasse la limite de {1} ; analyse spécifique non effectuée. Réduisez sa taille et réessayez. Les informations générales restent disponibles.",
    "El archivo de {0} supera el límite de {1}; no se ejecutó el análisis específico. Reduce su tamaño y vuelve a analizar. La información básica sigue disponible."
  ],
  "文档": [
    "Document",
    "文書",
    "문서",
    "document",
    "documento"
  ],
  "音视频": [
    "Audio/video",
    "音声・動画",
    "오디오·비디오",
    "audio/vidéo",
    "audio/vídeo"
  ],
  "只能导入本地绝对路径。": [
    "Only absolute local file paths can be imported.",
    "端末内のファイルの絶対パスのみ追加できます。",
    "로컬 절대 경로의 파일만 가져올 수 있습니다.",
    "Seuls les chemins locaux absolus sont acceptés.",
    "Solo se admiten rutas locales absolutas."
  ],
  "文件已移除，请重新添加。": [
    "The file was removed. Add it again.",
    "ファイルは一覧から削除されています。もう一度追加してください。",
    "파일이 제거되었습니다. 다시 추가하세요.",
    "Le fichier a été retiré. Ajoutez-le à nouveau.",
    "Se quitó el archivo. Añádelo de nuevo."
  ],
  "请先完成文件参数分析。": [
    "Complete the file analysis first.",
    "先にファイルのパラメーター解析を完了してください。",
    "파일 매개변수 분석을 먼저 완료하세요.",
    "Terminez d’abord l’analyse du fichier.",
    "Completa primero el análisis del archivo."
  ],
  "请选择文件中有效的音轨。": [
    "Select a valid audio track in the file.",
    "ファイル内の有効な音声トラックを選択してください。",
    "파일에서 유효한 오디오 트랙을 선택하세요.",
    "Sélectionnez une piste audio valide du fichier.",
    "Selecciona una pista de audio válida del archivo."
  ],
  "频谱生成不可用。": [
    "Spectrogram generation is unavailable.",
    "スペクトログラム生成を利用できません。",
    "스펙트로그램 생성을 사용할 수 없습니다.",
    "Création du spectrogramme indisponible.",
    "La generación del espectrograma no está disponible."
  ],
  "另一个频谱正在生成，请稍后重试或取消。": [
    "Another spectrogram is being generated. Wait or cancel it.",
    "別のスペクトログラムを生成しています。完了を待つか、キャンセルしてください。",
    "다른 스펙트로그램을 생성 중입니다. 기다리거나 취소하세요.",
    "Un autre spectrogramme est en cours. Patientez ou annulez-le.",
    "Se está generando otro espectrograma. Espera o cancélalo."
  ],
  "文件解析已取消。": [
    "File analysis canceled.",
    "ファイルの解析をキャンセルしました。",
    "파일 분석을 취소했습니다.",
    "Analyse du fichier annulée.",
    "Se canceló el análisis del archivo."
  ],
  "文件分析失败，请重试。": [
    "File analysis failed. Try again.",
    "ファイルの解析に失敗しました。もう一度お試しください。",
    "파일 분석에 실패했습니다. 다시 시도하세요.",
    "Échec de l’analyse. Réessayez.",
    "El análisis falló. Vuelve a intentarlo."
  ],
  "分析窗口已关闭。": [
    "The analysis window is closed.",
    "解析ウィンドウは閉じられています。",
    "분석 창이 닫혔습니다.",
    "La fenêtre d’analyse est fermée.",
    "La ventana de análisis está cerrada."
  ],
  "分析线程返回了无效结果。": [
    "The analysis worker returned an invalid result.",
    "解析スレッドが無効な結果を返しました。",
    "분석 작업이 잘못된 결과를 반환했습니다.",
    "Le processus d’analyse a renvoyé un résultat invalide.",
    "El proceso de análisis devolvió un resultado no válido."
  ],
  "分析线程意外退出（{0}），请重试。": [
    "The analysis worker exited unexpectedly ({0}). Try again.",
    "解析スレッドが予期せず終了しました（{0}）。もう一度お試しください。",
    "분석 작업이 예기치 않게 종료되었습니다({0}). 다시 시도하세요.",
    "Le processus d’analyse s’est arrêté inopinément ({0}). Réessayez.",
    "El proceso de análisis terminó de forma inesperada ({0}). Vuelve a intentarlo."
  ],
  "不允许的窗口来源。": [
    "This window is not allowed to perform the operation.",
    "このウィンドウからの操作は許可されていません。",
    "이 창에서는 해당 작업이 허용되지 않습니다.",
    "Cette fenêtre n’est pas autorisée à effectuer l’opération.",
    "Esta ventana no tiene permiso para realizar la operación."
  ],
  "文件列表参数无效。": [
    "The file list is invalid.",
    "ファイル一覧の指定が無効です。",
    "파일 목록이 잘못되었습니다.",
    "La liste de fichiers est invalide.",
    "La lista de archivos no es válida."
  ],
  "只能导入本地文件。": [
    "Only local files can be imported.",
    "端末内のファイルのみ追加できます。",
    "로컬 파일만 가져올 수 있습니다.",
    "Seuls les fichiers locaux peuvent être importés.",
    "Solo se pueden importar archivos locales."
  ],
  "添加本地文件": [
    "Add local files",
    "端末内のファイルを追加",
    "로컬 파일 추가",
    "Ajouter des fichiers locaux",
    "Añadir archivos locales"
  ],
  "音轨参数无效。": [
    "Invalid audio track parameter.",
    "音声トラックの指定が無効です。",
    "오디오 트랙 매개변수가 잘못되었습니다.",
    "Paramètre de piste audio invalide.",
    "El parámetro de pista de audio no es válido."
  ],
  "频谱生成失败，请重试。": [
    "Could not generate the spectrogram. Try again.",
    "スペクトログラムを生成できませんでした。もう一度お試しください。",
    "스펙트로그램을 생성하지 못했습니다. 다시 시도하세요.",
    "Impossible de créer le spectrogramme. Réessayez.",
    "No se pudo generar el espectrograma. Vuelve a intentarlo."
  ],
  "界面颜色配置缺失，请先运行 npm run build。": [
    "Interface colors are missing. Run npm run build first.",
    "画面の色設定がありません。先に npm run build を実行してください。",
    "인터페이스 색상 설정이 없습니다. 먼저 npm run build를 실행하세요.",
    "Couleurs de l’interface absentes. Exécutez d’abord npm run build.",
    "Faltan los colores de la interfaz. Ejecuta primero npm run build."
  ],
  "隐藏 File Analyzer": [
    "Hide File Analyzer",
    "File Analyzer を非表示",
    "File Analyzer 가리기",
    "Masquer File Analyzer",
    "Ocultar File Analyzer"
  ],
  "隐藏其他应用": [
    "Hide others",
    "ほかを非表示",
    "다른 앱 가리기",
    "Masquer les autres",
    "Ocultar los demás"
  ],
  "显示全部": [
    "Show all",
    "すべて表示",
    "모두 표시",
    "Tout afficher",
    "Mostrar todo"
  ],
  "退出 File Analyzer": [
    "Quit File Analyzer",
    "File Analyzer を終了",
    "File Analyzer 종료",
    "Quitter File Analyzer",
    "Salir de File Analyzer"
  ],
  "编辑": [
    "Edit",
    "編集",
    "편집",
    "Édition",
    "Edición"
  ],
  "复制": [
    "Copy",
    "コピー",
    "복사",
    "Copier",
    "Copiar"
  ],
  "全选": [
    "Select all",
    "すべてを選択",
    "모두 선택",
    "Tout sélectionner",
    "Seleccionar todo"
  ],
  "窗口": [
    "Window",
    "ウィンドウ",
    "창",
    "Fenêtre",
    "Ventana"
  ],
  "最小化": [
    "Minimize",
    "最小化",
    "최소화",
    "Réduire",
    "Minimizar"
  ],
  "关闭窗口": [
    "Close window",
    "ウィンドウを閉じる",
    "창 닫기",
    "Fermer la fenêtre",
    "Cerrar ventana"
  ],
  "File Analyzer 启动失败：": [
    "File Analyzer could not start:",
    "File Analyzer を起動できませんでした：",
    "File Analyzer를 시작하지 못했습니다:",
    "Impossible de démarrer File Analyzer :",
    "No se pudo iniciar File Analyzer:"
  ],
  "请选择本地文件。": [
    "Choose local files.",
    "端末内のファイルを選択してください。",
    "로컬 파일을 선택하세요.",
    "Choisissez des fichiers locaux.",
    "Elige archivos locales."
  ],
  "无法访问随包工具：{0}": [
    "Cannot access bundled tool: {0}",
    "同梱ツールにアクセスできません：{0}",
    "내장 도구에 접근할 수 없습니다: {0}",
    "Impossible d’accéder à l’outil intégré : {0}",
    "No se puede acceder a la herramienta incluida: {0}"
  ],
  "{0} 解析已取消。": [
    "{0} analysis canceled.",
    "{0} の解析をキャンセルしました。",
    "{0} 분석을 취소했습니다.",
    "Analyse {0} annulée.",
    "Se canceló el análisis de {0}."
  ],
  "未找到 {0}，请安装工具或设置其路径。": [
    "{0} was not found. Install the tool or configure its path.",
    "{0} が見つかりません。ツールをインストールするか、パスを設定してください。",
    "{0}을(를) 찾지 못했습니다. 도구를 설치하거나 경로를 설정하세요.",
    "{0} introuvable. Installez l’outil ou configurez son chemin.",
    "No se encontró {0}. Instala la herramienta o configura su ruta."
  ],
  "{0} 无法执行，请检查路径和权限。": [
    "{0} cannot run. Check its path and permissions.",
    "{0} を実行できません。パスと権限を確認してください。",
    "{0}을(를) 실행할 수 없습니다. 경로와 권한을 확인하세요.",
    "Impossible d’exécuter {0}. Vérifiez le chemin et les autorisations.",
    "No se puede ejecutar {0}. Comprueba la ruta y los permisos."
  ],
  "{0} 输出超过允许大小。": [
    "{0} output exceeds the allowed size.",
    "{0} の出力が許容サイズを超えています。",
    "{0} 출력이 허용 크기를 초과합니다.",
    "La sortie de {0} dépasse la taille autorisée.",
    "La salida de {0} supera el tamaño permitido."
  ],
  "{0} 解析超时（{1} ms）。": [
    "{0} analysis timed out ({1} ms).",
    "{0} の解析がタイムアウトしました（{1} ms）。",
    "{0} 분석 시간이 초과되었습니다({1} ms).",
    "Délai d’analyse de {0} dépassé ({1} ms).",
    "El análisis de {0} agotó el tiempo ({1} ms)."
  ],
  "{0} 解析失败：{1}": [
    "{0} analysis failed: {1}",
    "{0} の解析に失敗しました：{1}",
    "{0} 분석에 실패했습니다: {1}",
    "Échec de l’analyse {0} : {1}",
    "El análisis de {0} falló: {1}"
  ],
  "OOXML 读取超时（{0} ms）": [
    "OOXML read timed out ({0} ms)",
    "OOXML の読み取りがタイムアウトしました（{0} ms）",
    "OOXML 읽기 시간 초과({0} ms)",
    "Délai de lecture OOXML dépassé ({0} ms)",
    "La lectura de OOXML agotó el tiempo ({0} ms)"
  ],
  "无法打开 OOXML ZIP": [
    "Cannot open OOXML ZIP",
    "OOXML ZIP を開けません",
    "OOXML ZIP을 열 수 없습니다",
    "Impossible d’ouvrir le ZIP OOXML",
    "No se puede abrir el ZIP OOXML"
  ],
  "OOXML ZIP 条目超过 {0} 个的解析上限": [
    "OOXML ZIP exceeds the {0}-entry limit",
    "OOXML ZIP の項目数が上限 {0} 件を超えています",
    "OOXML ZIP 항목이 {0}개 한도를 초과합니다",
    "Le ZIP OOXML dépasse la limite de {0} entrées",
    "El ZIP OOXML supera el límite de {0} entradas"
  ],
  "OOXML ZIP 条目名称总大小超过 12 MiB 上限": [
    "OOXML ZIP entry names exceed the 12 MiB total limit",
    "OOXML ZIP の項目名の合計が 12 MiB を超えています",
    "OOXML ZIP 항목 이름 합계가 12 MiB를 초과합니다",
    "Les noms des entrées ZIP OOXML dépassent 12 MiB au total",
    "Los nombres de las entradas ZIP OOXML superan 12 MiB en total"
  ],
  "OOXML 包含重复部件：{0}": [
    "Duplicate OOXML part: {0}",
    "OOXML パッケージ内の部品が重複しています：{0}",
    "OOXML 구성 요소가 중복됩니다: {0}",
    "Composant OOXML en double : {0}",
    "Componente OOXML duplicado: {0}"
  ],
  "OOXML 所需 XML 部件超过解压大小上限（单部件 4 MiB，总计 12 MiB）": [
    "Required OOXML XML exceeds the expanded-size limit (4 MiB per part, 12 MiB total)",
    "必要な OOXML XML の展開サイズが上限を超えています（各部品 4 MiB、合計 12 MiB）",
    "필요한 OOXML XML이 압축 해제 한도를 초과합니다(부분당 4 MiB, 합계 12 MiB)",
    "Le XML OOXML requis dépasse la limite décompressée (4 MiB par élément, 12 MiB au total)",
    "El XML OOXML necesario supera el límite descomprimido (4 MiB por parte, 12 MiB en total)"
  ],
  "OOXML XML 实际解压数据超过允许大小": [
    "Actual expanded OOXML XML exceeds the allowed size",
    "OOXML XML の実際の展開データが許容サイズを超えています",
    "OOXML XML의 실제 압축 해제 데이터가 허용 크기를 초과합니다",
    "Le XML OOXML réellement décompressé dépasse la taille autorisée",
    "El XML OOXML descomprimido supera el tamaño permitido"
  ],
  "不接受含 DTD 或实体声明的 XML": [
    "XML with DTD or entity declarations is not accepted",
    "DTD または実体宣言を含む XML は受け付けません",
    "DTD 또는 엔터티 선언이 포함된 XML은 허용하지 않습니다",
    "Le XML avec DTD ou déclarations d’entités n’est pas accepté",
    "No se admite XML con DTD o declaraciones de entidades"
  ],
  "XML 格式无效：{0}": [
    "Invalid XML format: {0}",
    "XML 形式が無効です：{0}",
    "XML 형식이 잘못되었습니다: {0}",
    "Format XML invalide : {0}",
    "Formato XML no válido: {0}"
  ],
  "缺少 XML 根元素 {0}": [
    "Missing XML root element {0}",
    "XML のルート要素 {0} がありません",
    "XML 루트 요소 {0}이(가) 없습니다",
    "Élément racine XML {0} absent",
    "Falta el elemento raíz XML {0}"
  ],
  "XML 根元素 {0} 结构无效": [
    "Invalid structure of XML root element {0}",
    "XML のルート要素 {0} の構造が無効です",
    "XML 루트 요소 {0}의 구조가 잘못되었습니다",
    "Structure invalide de l’élément racine XML {0}",
    "La estructura del elemento raíz XML {0} no es válida"
  ],
  "XML 命名空间无效": [
    "Invalid XML namespace",
    "XML 名前空間が無効です",
    "XML 네임스페이스가 잘못되었습니다",
    "Espace de noms XML invalide",
    "El espacio de nombres XML no es válido"
  ],
  "timeoutMs 必须是 1 到 {0} 之间的整数。": [
    "timeoutMs must be an integer from 1 to {0}.",
    "timeoutMs は 1～{0} の整数で指定してください。",
    "timeoutMs는 1~{0} 사이의 정수여야 합니다.",
    "timeoutMs doit être un entier compris entre 1 et {0}.",
    "timeoutMs debe ser un entero entre 1 y {0}."
  ],
  "正在生成 {0} 的频谱；完成后可生成此音轨，也可切回该文件取消。": [
    "Generating a spectrogram for {0}. When it finishes, generate this track or return to that file to cancel.",
    "{0} のスペクトログラムを生成しています。完了後にこのトラックを生成するか、処理中のファイルに戻ってキャンセルできます。",
    "{0}의 스펙트로그램을 생성 중입니다. 완료 후 이 트랙을 생성하거나 해당 파일로 돌아가 취소하세요.",
    "Création du spectrogramme de {0}. Attendez la fin ou revenez à ce fichier pour annuler.",
    "Generando el espectrograma de {0}. Espera a que termine o vuelve a ese archivo para cancelarlo."
  ],
  "另一个文件": [
    "another file",
    "別のファイル",
    "다른 파일",
    "un autre fichier",
    "otro archivo"
  ],
  "{0} mm（{1} pt）": [
    "{0} mm ({1} pt)",
    "{0} mm（{1} pt）",
    "{0} mm({1} pt)",
    "{0} mm ({1} pt)",
    "{0} mm ({1} pt)"
  ],
  "不支持此语言。": [
    "This language is not supported.",
    "この言語には対応していません。",
    "지원하지 않는 언어입니다.",
    "Cette langue n’est pas prise en charge.",
    "Este idioma no es compatible."
  ],
  "界面语言已更新。": [
    "Interface language updated.",
    "表示言語を変更しました。",
    "인터페이스 언어를 변경했습니다.",
    "Langue de l’interface modifiée.",
    "Se actualizó el idioma de la interfaz."
  ],
  "{0} {1}（{2}）": [
    "{0} {1} ({2})",
    "{0} {1}（{2}）",
    "{0} {1}({2})",
    "{0} {1} ({2})",
    "{0} {1} ({2})"
  ],
  "{0}（{1}）": [
    "{0} ({1})",
    "{0}（{1}）",
    "{0}({1})",
    "{0} ({1})",
    "{0} ({1})"
  ],
  "File Analyzer — 离线文件参数与隐私元数据检查": [
    "File Analyzer — Offline file parameters and privacy metadata",
    "File Analyzer — オフラインのファイル解析・プライバシー確認",
    "File Analyzer — 오프라인 파일 매개변수 및 개인정보 메타데이터 검사",
    "File Analyzer — Paramètres et métadonnées personnelles hors ligne",
    "File Analyzer — Parámetros y metadatos personales sin conexión"
  ],
  "用法：npm run analyze -- [选项] <文件...>": [
    "Usage: npm run analyze -- [options] <files...>",
    "使い方：npm run analyze -- [オプション] <ファイル...>",
    "사용법: npm run analyze -- [옵션] <파일...>",
    "Utilisation : npm run analyze -- [options] <fichiers...>",
    "Uso: npm run analyze -- [opciones] <archivos...>"
  ],
  "输出 JSON 数组（适合程序读取）": [
    "Output a JSON array for programmatic use",
    "プログラム向けに JSON 配列を出力",
    "프로그램용 JSON 배열 출력",
    "Afficher un tableau JSON pour traitement logiciel",
    "Mostrar una matriz JSON para uso programático"
  ],
  "界面语言": [
    "Interface language",
    "表示言語",
    "인터페이스 언어",
    "Langue de l’interface",
    "Idioma de la interfaz"
  ],
  "指定 ffprobe 路径": [
    "Set the ffprobe path",
    "ffprobe のパスを指定",
    "ffprobe 경로 지정",
    "Définir le chemin de ffprobe",
    "Indicar la ruta de ffprobe"
  ],
  "指定 ExifTool 路径": [
    "Set the ExifTool path",
    "ExifTool のパスを指定",
    "ExifTool 경로 지정",
    "Définir le chemin d’ExifTool",
    "Indicar la ruta de ExifTool"
  ],
  "随包工具目录，优先于指定路径和 PATH": [
    "Bundled tools directory; takes priority over paths and PATH",
    "同梱ツールのディレクトリー（指定パス・PATH より優先）",
    "내장 도구 폴더, 지정 경로와 PATH보다 우선",
    "Dossier des outils intégrés, prioritaire sur les chemins et PATH",
    "Carpeta de herramientas incluidas, con prioridad sobre rutas y PATH"
  ],
  "单次内容识别/工具调用超时，默认 15000 毫秒": [
    "Timeout per detection/tool call; default 15000 ms",
    "形式判定・ツール呼び出しごとのタイムアウト（初期値 15000 ms）",
    "감지/도구 호출별 시간 제한, 기본 15000 ms",
    "Délai par détection/appel d’outil, 15000 ms par défaut",
    "Tiempo por detección/llamada, 15000 ms por defecto"
  ],
  "后续参数均作为文件路径": [
    "Treat all following arguments as file paths",
    "以降の引数をすべてファイルパスとして扱う",
    "이후 인수를 모두 파일 경로로 처리",
    "Traiter les arguments suivants comme des chemins de fichiers",
    "Tratar los argumentos siguientes como rutas de archivo"
  ],
  "显示帮助": [
    "Show help",
    "ヘルプを表示",
    "도움말 표시",
    "Afficher l’aide",
    "Mostrar ayuda"
  ],
  "也可设置 FILE_ANALYZER_FFPROBE 和 FILE_ANALYZER_EXIFTOOL。": [
    "You can also set FILE_ANALYZER_FFPROBE and FILE_ANALYZER_EXIFTOOL.",
    "FILE_ANALYZER_FFPROBE と FILE_ANALYZER_EXIFTOOL でも設定できます。",
    "FILE_ANALYZER_FFPROBE와 FILE_ANALYZER_EXIFTOOL로도 설정할 수 있습니다.",
    "Vous pouvez aussi définir FILE_ANALYZER_FFPROBE et FILE_ANALYZER_EXIFTOOL.",
    "También puedes definir FILE_ANALYZER_FFPROBE y FILE_ANALYZER_EXIFTOOL."
  ],
  "PDF 结构检查默认超时 60000 毫秒；显式 --timeout 同样约束结构检查。": [
    "PDF structure timeout defaults to 60000 ms; --timeout also applies to structural checking.",
    "PDF 構造確認の初期タイムアウトは 60000 ms です。--timeout は構造確認にも適用されます。",
    "PDF 구조 검사 기본 시간 제한은 60000 ms이며 --timeout도 구조 검사에 적용됩니다.",
    "Délai PDF par défaut : 60000 ms ; --timeout s’applique aussi à la structure.",
    "El límite estructural PDF es de 60000 ms por defecto; --timeout también se aplica a esa revisión."
  ],
  "退出码：0 成功（包括仅基础信息），1 有文件失败或部分解析，2 参数错误。": [
    "Exit codes: 0 success (including basic info only), 1 failed or partial file analysis, 2 invalid arguments.",
    "終了コード：0 成功（基本情報のみを含む）、1 失敗または一部解析、2 引数エラー。",
    "종료 코드: 0 성공(기본 정보만 포함), 1 실패 또는 부분 분석, 2 인수 오류.",
    "Codes de sortie : 0 succès (informations générales seules incluses), 1 échec ou analyse partielle, 2 arguments invalides.",
    "Códigos de salida: 0 éxito (incluida solo información básica), 1 fallo o análisis parcial, 2 argumentos no válidos."
  ],
  "范围": [
    "Scope",
    "対象",
    "범위",
    "Portée",
    "Ámbito"
  ],
  "说明": [
    "Note",
    "注記",
    "설명",
    "Note",
    "Nota"
  ],
  "文件": [
    "File",
    "ファイル",
    "파일",
    "Fichier",
    "Archivo"
  ],
  "隐私元数据检查：{0}；发现 {1} 项。": [
    "Privacy metadata check: {0}; {1} finding¦Privacy metadata check: {0}; {1} findings",
    "プライバシー関連メタデータの確認：{0}、検出 {1} 件。",
    "개인정보 메타데이터 검사: {0}, 발견 {1}개.",
    "Métadonnées personnelles : {0} ; {1} entrée¦Métadonnées personnelles : {0} ; {1} entrées",
    "Metadatos personales: {0}; {1} registro¦Metadatos personales: {0}; {1} registros"
  ],
  "类别": [
    "Category",
    "分類",
    "분류",
    "Catégorie",
    "Categoría"
  ],
  "{0} 缺少值。": [
    "Missing value for {0}.",
    "{0} の値を指定してください。",
    "{0}의 값이 필요합니다.",
    "Valeur manquante pour {0}.",
    "Falta el valor de {0}."
  ],
  "未知选项：{0}；以 - 开头的文件名请放在 -- 后。": [
    "Unknown option: {0}. Put filenames starting with - after --.",
    "不明なオプション：{0}。- で始まるファイル名は -- の後に指定してください。",
    "알 수 없는 옵션: {0}. -로 시작하는 파일 이름은 -- 뒤에 지정하세요.",
    "Option inconnue : {0}. Placez les noms commençant par - après --.",
    "Opción desconocida: {0}. Coloca los nombres que empiecen por - después de --."
  ],
  "请提供至少一个文件。": [
    "Provide at least one file.",
    "少なくとも 1 つのファイルを指定してください。",
    "파일을 하나 이상 지정하세요.",
    "Indiquez au moins un fichier.",
    "Indica al menos un archivo."
  ],
  "内容识别超时（{0} ms）": [
    "Content detection timed out ({0} ms)",
    "内容の形式判定がタイムアウトしました（{0} ms）",
    "내용 감지 시간 초과({0} ms)",
    "Délai de détection du contenu dépassé ({0} ms)",
    "La detección del contenido agotó el tiempo ({0} ms)"
  ],
  "无法保存语言设置，请检查配置目录权限后重试。": [
    "Could not save the language setting. Check configuration-folder permissions and try again.",
    "言語設定を保存できませんでした。設定フォルダーの権限を確認して、もう一度お試しください。",
    "언어 설정을 저장하지 못했습니다. 설정 폴더 권한을 확인하고 다시 시도하세요.",
    "Impossible d’enregistrer la langue. Vérifiez les autorisations du dossier de configuration et réessayez.",
    "No se pudo guardar el idioma. Comprueba los permisos de la carpeta de configuración y reinténtalo."
  ],
  "文件参数查看工具": [
    "File parameter inspector",
    "ファイルのパラメーター確認ツール",
    "파일 매개변수 확인 도구",
    "Outil d’inspection des fichiers",
    "Herramienta de inspección de archivos"
  ],
  "本地解析": [
    "Local analysis",
    "端末内で解析",
    "기기에서 분석",
    "Analyse locale",
    "Análisis local"
  ],
  "检查文件，了解规格。": [
    "Inspect files. Understand their specs.",
    "ファイルを確認して、仕様を把握。",
    "파일을 확인하고 사양을 파악하세요.",
    "Inspectez les fichiers et leurs caractéristiques.",
    "Inspecciona archivos y conoce sus características."
  ],
  "音频、视频、图片、Office 与 PDF 文档": [
    "Audio, video, images, Office and PDF documents",
    "音声・動画・画像・Office・PDF 文書",
    "오디오, 비디오, 이미지, Office 및 PDF 문서",
    "Audio, vidéo, images, documents Office et PDF",
    "Audio, vídeo, imágenes, documentos de Office y PDF"
  ],
  "添加文件": [
    "Add files",
    "ファイルを追加",
    "파일 추가",
    "Ajouter des fichiers",
    "Añadir archivos"
  ],
  "导入的文件": [
    "Imported files",
    "追加したファイル",
    "가져온 파일",
    "Fichiers importés",
    "Archivos importados"
  ],
  "文件列表": [
    "File list",
    "ファイル一覧",
    "파일 목록",
    "Liste des fichiers",
    "Lista de archivos"
  ],
  "清空列表": [
    "Clear list",
    "一覧をクリア",
    "목록 비우기",
    "Vider la liste",
    "Vaciar lista"
  ],
  "可一次添加多个文件": [
    "You can add multiple files at once",
    "複数のファイルを一度に追加できます",
    "여러 파일을 한 번에 추가할 수 있습니다",
    "Ajoutez plusieurs fichiers à la fois",
    "Puedes añadir varios archivos a la vez"
  ],
  "清空或移除仅影响列表，原文件保持不变。": [
    "Clearing or removing affects only the list. Original files stay unchanged.",
    "クリアや削除は一覧のみが対象です。元のファイルは変更されません。",
    "비우기와 제거는 목록에만 적용되며 원본 파일은 변경되지 않습니다.",
    "Vider ou retirer ne modifie que la liste. Les originaux restent inchangés.",
    "Vaciar o quitar solo afecta a la lista. Los originales no cambian."
  ],
  "文件检查": [
    "File inspection",
    "ファイルの確認",
    "파일 검사",
    "Inspection du fichier",
    "Inspección del archivo"
  ],
  "查看方式": [
    "View mode",
    "表示方法",
    "보기 방식",
    "Mode d’affichage",
    "Modo de vista"
  ],
  "文件详情": [
    "File details",
    "ファイル詳細",
    "파일 상세",
    "Détails du fichier",
    "Detalles del archivo"
  ],
  "参数对比": [
    "Compare parameters",
    "パラメーター比較",
    "매개변수 비교",
    "Comparer les paramètres",
    "Comparar parámetros"
  ],
  "文件留在本机，参数按实际内容读取": [
    "Files stay on this device; parameters are read from their content",
    "ファイルは端末内に保持し、内容からパラメーターを読み取ります",
    "파일은 기기에 유지되며 내용에서 매개변수를 읽습니다",
    "Les fichiers restent sur cet appareil ; paramètres lus dans leur contenu",
    "Los archivos permanecen en este dispositivo; los parámetros se leen del contenido"
  ],
  "松开以添加文件": [
    "Drop to add files",
    "ドロップしてファイルを追加",
    "놓아서 파일 추가",
    "Relâchez pour ajouter les fichiers",
    "Suelta para añadir archivos"
  ],
  "将在本机读取文件参数": [
    "File parameters will be read locally",
    "端末内でファイルのパラメーターを読み取ります",
    "기기에서 파일 매개변수를 읽습니다",
    "Les paramètres seront lus localement",
    "Los parámetros se leerán localmente"
  ],
  "AUDIO / VIDEO / IMAGE / OFFICE / PDF": [
    "AUDIO / VIDEO / IMAGE / OFFICE / PDF",
    "音声 / 動画 / 画像 / OFFICE / PDF",
    "오디오 / 비디오 / 이미지 / OFFICE / PDF",
    "AUDIO / VIDÉO / IMAGE / OFFICE / PDF",
    "AUDIO / VÍDEO / IMAGEN / OFFICE / PDF"
  ],
  "1 pt = 1/72 inch": [
    "1 pt = 1/72 inch",
    "1 pt = 1/72 インチ",
    "1 pt = 1/72 인치",
    "1 pt = 1/72 pouce",
    "1 pt = 1/72 pulgada"
  ],
  "byte": [
    "byte¦bytes",
    "byte",
    "byte",
    "octet¦octets",
    "byte¦bytes"
  ],
  "bit/channel": [
    "bit/channel",
    "bit/チャンネル",
    "bit/채널",
    "bit/canal",
    "bit/canal"
  ],
  "bit/pixel": [
    "bit/pixel",
    "bit/ピクセル",
    "bit/픽셀",
    "bit/pixel",
    "bit/píxel"
  ]
};
