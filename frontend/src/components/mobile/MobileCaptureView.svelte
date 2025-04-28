<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { push } from 'svelte-spa-router';
  import Icon from '../common/Icon.svelte';
  import Button from '../common/Button.svelte';
  import Card from '../common/Card.svelte';
  import StatusMessage from '../common/StatusMessage.svelte';
  import { authStore } from '../../stores/authStore';
  import sqliteService from '../../services/sqliteService';

  let isMobile = false;
  let hasCamera = false;
  let isCapturing = false;
  let imageCapture: any = null;
  let videoElement: HTMLVideoElement;
  let statusMessage = '';
  let statusType: 'success' | 'error' | 'info' | 'warning' = 'info';
  let capturedImage: string | null = null;
  let mediaStream: MediaStream | null = null;
  let fileInput: HTMLInputElement;
  let isUploading = false;
  let showFullscreenButton = true;
  let dbInitialized = false;

  // Referencia a la cámara trasera (si existe)
  async function setupCamera() {
    try {
      if (!videoElement) {
        statusMessage = 'No se pudo acceder al elemento de video. Intenta recargar la página.';
        statusType = 'error';
        return;
      }

      // Intentar obtener acceso a la cámara trasera primero
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      videoElement.srcObject = mediaStream;
      videoElement.play();

      // Configurar la captura de imágenes
      const videoTrack = mediaStream.getVideoTracks()[0];
      imageCapture = new (window as any).ImageCapture(videoTrack);

      hasCamera = true;
      statusMessage = 'Cámara lista. Apunta a tu boleta o recibo.';
      statusType = 'success';
    } catch (err) {
      console.error('Error al acceder a la cámara:', err);
      hasCamera = false;
      statusMessage =
        'No se pudo acceder a la cámara. Por favor, revisa los permisos del navegador o sube una imagen manualmente.';
      statusType = 'error';
    }
  }

  function stopCamera() {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }
    if (videoElement) {
      videoElement.srcObject = null;
    }
  }

  async function captureImage() {
    if (!imageCapture) return;

    try {
      isCapturing = true;
      statusMessage = 'Capturando imagen...';
      statusType = 'info';

      // Tomar una foto usando la API ImageCapture
      const photoBlob = await imageCapture.takePhoto();
      const url = URL.createObjectURL(photoBlob);
      capturedImage = url;

      statusMessage = 'Imagen capturada exitosamente';
      statusType = 'success';

      // Procesar la imagen
      processImage(photoBlob);
    } catch (err) {
      console.error('Error al capturar la imagen:', err);
      statusMessage = 'Error al capturar la imagen. Intenta de nuevo.';
      statusType = 'error';
    } finally {
      isCapturing = false;
    }
  }

  async function processImage(imageBlob: Blob) {
    // Verificar si la base de datos está inicializada
    if (!dbInitialized) {
      statusMessage = 'La base de datos no está lista. Intenta nuevamente.';
      statusType = 'error';
      return;
    }

    // Aquí iría el código para procesar la imagen (OCR, clasificación, etc.)
    // Por ahora, simplemente guardamos la imagen en la base de datos
    try {
      // Convertir Blob a Base64
      const reader = new FileReader();
      reader.readAsDataURL(imageBlob);
      reader.onloadend = async function () {
        const base64data = reader.result as string;

        try {
          // Guardar en la base de datos
          const dateNow = new Date().toISOString();
          const filename = `receipt_${dateNow.replace(/[^0-9]/g, '')}.jpg`;

          await sqliteService.query(
            `
            INSERT INTO receipts (
              user_id, 
              image_data, 
              filename, 
              capture_date, 
              status, 
              ocr_text
            ) VALUES (?, ?, ?, ?, ?, ?)
          `,
            [$authStore.user?.id || 0, base64data, filename, dateNow, 'pending', ''],
          );

          statusMessage =
            '¡Recibo guardado exitosamente! Puedes seguir capturando más boletas o revisar los datos capturados.';
          statusType = 'success';

          // En 3 segundos, borrar la imagen capturada para poder capturar otra
          setTimeout(() => {
            capturedImage = null;
          }, 3000);
        } catch (err) {
          console.error('Error al guardar la imagen en la base de datos:', err);
          statusMessage = 'Error al guardar el recibo. Intenta nuevamente.';
          statusType = 'error';
        }
      };
    } catch (err) {
      console.error('Error al procesar la imagen:', err);
      statusMessage = 'Error al procesar la imagen. Intenta nuevamente.';
      statusType = 'error';
    }
  }

  function handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    isUploading = true;
    statusMessage = 'Procesando archivo...';
    statusType = 'info';

    // Validar tamaño y tipo
    if (file.size > 10 * 1024 * 1024) {
      // 10MB máximo
      statusMessage = 'El archivo es demasiado grande. Máximo 10MB.';
      statusType = 'error';
      isUploading = false;
      return;
    }

    if (!file.type.startsWith('image/')) {
      statusMessage = 'Por favor selecciona un archivo de imagen válido.';
      statusType = 'error';
      isUploading = false;
      return;
    }

    // Procesar el archivo
    const reader = new FileReader();
    reader.onload = () => {
      capturedImage = reader.result as string;
      processImage(file);
      isUploading = false;
    };
    reader.onerror = () => {
      statusMessage = 'Error al leer el archivo.';
      statusType = 'error';
      isUploading = false;
    };
    reader.readAsDataURL(file);
  }

  function goToData() {
    push('/data');
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error al intentar modo pantalla completa: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  // Verificar si la tabla 'receipts' existe, y crearla si no
  async function ensureReceiptsTable() {
    try {
      // Verificar que la base de datos esté inicializada
      if (!dbInitialized) {
        statusMessage = 'Esperando a que la base de datos se inicialice...';
        statusType = 'info';
        return false;
      }

      // Verificar si la tabla existe
      const tableCheck = await sqliteService.query(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='receipts'
      `);

      if (tableCheck.length === 0) {
        // Crear la tabla si no existe
        await sqliteService.query(`
          CREATE TABLE receipts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            image_data TEXT NOT NULL,
            filename TEXT NOT NULL,
            capture_date TEXT NOT NULL,
            status TEXT NOT NULL,
            ocr_text TEXT,
            category_id INTEGER,
            amount REAL,
            description TEXT,
            receipt_date TEXT,
            merchant TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (category_id) REFERENCES categories(id)
          )
        `);
        console.log('Tabla receipts creada exitosamente');
      }
      return true;
    } catch (err) {
      console.error('Error al verificar/crear tabla receipts:', err);
      statusMessage =
        'No se pudo acceder a la base de datos. Intenta navegar al Dashboard y volver.';
      statusType = 'error';
      return false;
    }
  }

  onMount(async () => {
    // Detectar si es móvil
    isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );

    // Asegurar que la base de datos está inicializada
    try {
      if (!sqliteService.isInitialized()) {
        await sqliteService.initialize();
      }
      dbInitialized = true;

      // Asegurar que existe la tabla para recibos
      await ensureReceiptsTable();
    } catch (err) {
      console.error('Error al inicializar la base de datos:', err);
      statusMessage =
        'No se pudo inicializar la base de datos. Intenta navegar al Dashboard y volver.';
      statusType = 'error';
    }

    // Si es móvil, iniciar la cámara automáticamente (con pequeña espera para asegurar que el DOM está listo)
    setTimeout(async () => {
      if (isMobile && 'mediaDevices' in navigator && 'ImageCapture' in window) {
        await setupCamera();
      } else if (isMobile) {
        statusMessage = 'Tu navegador no soporta la API de captura de imágenes.';
        statusType = 'warning';
      }
    }, 500);

    // Detectar cambios de orientación
    window.addEventListener('orientationchange', handleOrientationChange);

    // Detectar cambios de pantalla completa
    document.addEventListener('fullscreenchange', handleFullscreenChange);
  });

  function handleOrientationChange() {
    if (mediaStream) {
      // Reconfigurar la vista de la cámara si es necesario
      const videoTracks = mediaStream.getVideoTracks();
      if (videoTracks.length > 0) {
        const track = videoTracks[0];
        const settings = track.getSettings();
        // Ajustar configuración según sea necesario
      }
    }
  }

  function handleFullscreenChange() {
    showFullscreenButton = !document.fullscreenElement;
  }

  onDestroy(() => {
    stopCamera();
    window.removeEventListener('orientationchange', handleOrientationChange);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
  });
</script>

<div class="mobile-capture-container {isMobile ? 'mobile-view' : ''}">
  {#if statusMessage}
    <div class="status-container">
      <StatusMessage type={statusType} message={statusMessage} />
    </div>
  {/if}

  <div class="capture-content">
    {#if hasCamera}
      <div class="video-container">
        <video bind:this={videoElement} autoplay playsinline>
          <track kind="captions" src="" label="Español" />
        </video>
        {#if capturedImage}
          <div class="captured-preview">
            <img src={capturedImage} alt="Imagen capturada" />
          </div>
        {/if}
        <div class="camera-overlay">
          <div class="capture-guides"></div>
        </div>
      </div>
    {/if}

    <div class="actions-container">
      {#if !hasCamera}
        <div class="upload-container">
          <Card>
            <div class="upload-content">
              <Icon name="upload" />
              <h2>Sube tus boletas</h2>
              <p>Selecciona archivos desde tu galería</p>
              <Button variant="primary" fullWidth on:click={() => fileInput.click()}>
                Seleccionar archivo
              </Button>
              <input
                type="file"
                accept="image/*"
                on:change={handleFileUpload}
                bind:this={fileInput}
                style="display: none"
              />
            </div>
          </Card>
        </div>
      {:else}
        <button
          class="capture-button {isCapturing ? 'capturing' : ''}"
          on:click={captureImage}
          disabled={isCapturing || !!capturedImage}
          aria-label="Capturar foto de boleta"
        >
          <div class="capture-button-inner"></div>
        </button>

        <div class="secondary-actions">
          <button
            class="action-button upload-button"
            on:click={() => fileInput.click()}
            aria-label="Subir imagen desde galería"
          >
            <Icon name="upload" />
          </button>
          <input
            type="file"
            accept="image/*"
            on:change={handleFileUpload}
            bind:this={fileInput}
            style="display: none"
          />

          <button
            class="action-button data-button"
            on:click={goToData}
            aria-label="Ver datos capturados"
          >
            <Icon name="database" />
          </button>

          {#if showFullscreenButton}
            <button
              class="action-button fullscreen-button"
              on:click={toggleFullscreen}
              aria-label="Pantalla completa"
            >
              <Icon name="maximize" />
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .mobile-capture-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100%;
    background-color: var(--background-primary);
    position: relative;
  }

  .mobile-view {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    background-color: #000;
  }

  .status-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10;
    padding: var(--space-sm);
  }

  .capture-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .video-container {
    flex: 1;
    position: relative;
    overflow: hidden;
    background-color: #000;
  }

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .camera-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .capture-guides {
    width: 80%;
    height: 60%;
    border: 2px solid rgba(255, 255, 255, 0.5);
    border-radius: var(--radius-sm);
    box-shadow: 0 0 0 2000px rgba(0, 0, 0, 0.3);
  }

  .captured-preview {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 5;
  }

  .captured-preview img {
    max-width: 90%;
    max-height: 90%;
    object-fit: contain;
    border: 2px solid var(--primary);
  }

  .actions-container {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: var(--space-lg) var(--space-md);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 5;
  }

  .capture-button {
    width: 70px;
    height: 70px;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.3);
    border: none;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: all var(--transition-fast);
    box-shadow: var(--shadow-md);
  }

  .capture-button:hover {
    transform: scale(1.05);
  }

  .capture-button:active {
    transform: scale(0.95);
  }

  .capture-button-inner {
    width: 54px;
    height: 54px;
    border-radius: 50%;
    background-color: var(--primary);
    transition: all var(--transition-fast);
  }

  .capturing .capture-button-inner {
    width: 30px;
    height: 30px;
    background-color: var(--error);
  }

  .secondary-actions {
    position: absolute;
    bottom: var(--space-lg);
    right: var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .action-button {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.8);
    border: none;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    box-shadow: var(--shadow-sm);
    color: var(--primary);
    transition: all var(--transition-fast);
  }

  .action-button:hover {
    transform: scale(1.1);
    background-color: white;
  }

  .upload-container {
    width: 90%;
    max-width: 350px;
    margin: 0 auto;
  }

  .upload-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-md);
    text-align: center;
    gap: var(--space-md);
  }

  .upload-content h2 {
    margin: 0;
    color: var(--text-primary);
  }

  .upload-content p {
    margin: 0;
    color: var(--text-secondary);
  }

  /* Media queries para mejor adaptación */
  @media (orientation: landscape) {
    .capture-guides {
      width: 60%;
      height: 80%;
    }

    .secondary-actions {
      right: var(--space-lg);
      bottom: 50%;
      transform: translateY(50%);
    }
  }

  @media (max-height: 600px) {
    .capture-button {
      width: 60px;
      height: 60px;
    }

    .capture-button-inner {
      width: 46px;
      height: 46px;
    }
  }
</style>
