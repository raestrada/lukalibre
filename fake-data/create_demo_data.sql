-- Script para generar datos de prueba para LukaLibre
-- Este script crea datos realistas para todas las tablas del sistema

-- Categorías de gastos
INSERT INTO categorias (id, tipo, nombre, sub_tipo, descripcion) VALUES
('cat_g_01', 'gasto', 'Vivienda', 'fijo', 'Gastos relacionados con el hogar'),
('cat_g_02', 'gasto', 'Alimentación', 'variable', 'Compras de supermercado y comida'),
('cat_g_03', 'gasto', 'Transporte', 'variable', 'Gastos de movilización diaria'),
('cat_g_04', 'gasto', 'Servicios', 'fijo', 'Cuentas mensuales de servicios'),
('cat_g_05', 'gasto', 'Salud', 'variable', 'Médicos, remedios y tratamientos'),
('cat_g_06', 'gasto', 'Entretención', 'variable', 'Salidas, cine, conciertos'),
('cat_g_07', 'gasto', 'Educación', 'fijo', 'Cursos, colegio, universidad'),
('cat_g_08', 'gasto', 'Ropa', 'variable', 'Vestuario y accesorios'),
('cat_g_09', 'gasto', 'Deudas', 'fijo', 'Pago de créditos y deudas'),
('cat_g_10', 'gasto', 'Otros', 'variable', 'Gastos no clasificados');

-- Categorías de ingresos
INSERT INTO categorias (id, tipo, nombre, sub_tipo, descripcion, afecta_impuestos) VALUES
('cat_i_01', 'ingreso', 'Sueldo', 'fijo', 'Sueldo del trabajo principal', true),
('cat_i_02', 'ingreso', 'Honorarios', 'variable', 'Ingresos por boletas de honorarios', true),
('cat_i_03', 'ingreso', 'Inversiones', 'variable', 'Dividendos y ganancias de capital', true),
('cat_i_04', 'ingreso', 'Arriendos', 'fijo', 'Ingresos por propiedades', true),
('cat_i_05', 'ingreso', 'Ventas', 'variable', 'Ingresos por ventas personales', true),
('cat_i_06', 'ingreso', 'Regalo', 'variable', 'Dinero recibido como regalo', false),
('cat_i_07', 'ingreso', 'Bonos', 'variable', 'Bonos extraordinarios del trabajo', true),
('cat_i_08', 'ingreso', 'Otros', 'variable', 'Ingresos no clasificados', false);

-- Metas de ahorro
INSERT INTO metas (id, nombre, descripcion, objetivo_monto, fecha_objetivo, prioridad, tipo, activa) VALUES
('meta_01', 'Fondo de emergencia', 'Ahorro para emergencias, equivalente a 3 meses de gastos', 3000000, '2025-12-31', 1, 'emergencia', true),
('meta_02', 'Viaje a Europa', 'Ahorro para viaje familiar a Europa', 5000000, '2026-01-15', 2, 'vacaciones', true),
('meta_03', 'Pie de departamento', 'Ahorro para el pie de un departamento propio', 15000000, '2027-06-30', 3, 'vivienda', true),
('meta_04', 'Cambio de auto', 'Ahorro para cambiar el auto actual', 8000000, '2026-05-30', 4, 'transporte', true),
('meta_05', 'Postgrado', 'Ahorro para estudios de postgrado', 6000000, '2026-03-01', 5, 'educacion', true);

-- Gastos (3 meses de historial)
-- Abril 2025
INSERT INTO gastos (id, categoria_id, monto, fecha, fuente, descripcion) VALUES
('gasto_01', 'cat_g_01', 450000, '2025-04-01', 'tarjeta', 'Arriendo de abril'),
('gasto_02', 'cat_g_04', 25000, '2025-04-03', 'tarjeta', 'Cuenta luz'),
('gasto_03', 'cat_g_04', 18000, '2025-04-03', 'tarjeta', 'Cuenta agua'),
('gasto_04', 'cat_g_04', 35000, '2025-04-05', 'tarjeta', 'Internet y cable'),
('gasto_05', 'cat_g_02', 120000, '2025-04-08', 'efectivo', 'Supermercado'),
('gasto_06', 'cat_g_03', 45000, '2025-04-10', 'tarjeta', 'Bencina'),
('gasto_07', 'cat_g_05', 32000, '2025-04-12', 'tarjeta', 'Medicamentos'),
('gasto_08', 'cat_g_06', 65000, '2025-04-15', 'tarjeta', 'Cena y cine'),
('gasto_09', 'cat_g_08', 75000, '2025-04-18', 'tarjeta', 'Ropa de invierno'),
('gasto_10', 'cat_g_02', 85000, '2025-04-20', 'tarjeta', 'Supermercado'),
('gasto_11', 'cat_g_09', 150000, '2025-04-25', 'transferencia', 'Pago crédito de consumo'),
('gasto_12', 'cat_g_03', 40000, '2025-04-28', 'tarjeta', 'Bencina');

-- Marzo 2025
INSERT INTO gastos (id, categoria_id, monto, fecha, fuente, descripcion) VALUES
('gasto_13', 'cat_g_01', 450000, '2025-03-01', 'tarjeta', 'Arriendo de marzo'),
('gasto_14', 'cat_g_04', 28000, '2025-03-05', 'tarjeta', 'Cuenta luz'),
('gasto_15', 'cat_g_04', 20000, '2025-03-05', 'tarjeta', 'Cuenta agua'),
('gasto_16', 'cat_g_04', 35000, '2025-03-05', 'tarjeta', 'Internet y cable'),
('gasto_17', 'cat_g_02', 125000, '2025-03-08', 'efectivo', 'Supermercado'),
('gasto_18', 'cat_g_03', 50000, '2025-03-12', 'tarjeta', 'Bencina'),
('gasto_19', 'cat_g_06', 85000, '2025-03-18', 'tarjeta', 'Concierto'),
('gasto_20', 'cat_g_02', 95000, '2025-03-22', 'tarjeta', 'Supermercado'),
('gasto_21', 'cat_g_09', 150000, '2025-03-25', 'transferencia', 'Pago crédito de consumo'),
('gasto_22', 'cat_g_03', 42000, '2025-03-27', 'tarjeta', 'Bencina');

-- Febrero 2025
INSERT INTO gastos (id, categoria_id, monto, fecha, fuente, descripcion) VALUES
('gasto_23', 'cat_g_01', 450000, '2025-02-01', 'tarjeta', 'Arriendo de febrero'),
('gasto_24', 'cat_g_04', 32000, '2025-02-05', 'tarjeta', 'Cuenta luz'),
('gasto_25', 'cat_g_04', 22000, '2025-02-05', 'tarjeta', 'Cuenta agua'),
('gasto_26', 'cat_g_04', 35000, '2025-02-05', 'tarjeta', 'Internet y cable'),
('gasto_27', 'cat_g_02', 135000, '2025-02-08', 'efectivo', 'Supermercado'),
('gasto_28', 'cat_g_03', 55000, '2025-02-12', 'tarjeta', 'Bencina'),
('gasto_29', 'cat_g_06', 48000, '2025-02-15', 'tarjeta', 'Salida con amigos'),
('gasto_30', 'cat_g_02', 105000, '2025-02-20', 'tarjeta', 'Supermercado'),
('gasto_31', 'cat_g_09', 150000, '2025-02-25', 'transferencia', 'Pago crédito de consumo'),
('gasto_32', 'cat_g_07', 350000, '2025-02-28', 'transferencia', 'Matrícula curso online');

-- Ingresos (3 meses de historial)
-- Abril 2025
INSERT INTO ingresos (id, categoria_id, monto, fecha, fuente, descripcion) VALUES
('ingreso_01', 'cat_i_01', 1500000, '2025-04-05', 'transferencia', 'Sueldo de abril'),
('ingreso_02', 'cat_i_02', 250000, '2025-04-10', 'transferencia', 'Proyecto freelance desarrollo web'),
('ingreso_03', 'cat_i_03', 75000, '2025-04-20', 'transferencia', 'Dividendos fondo mutuo');

-- Marzo 2025
INSERT INTO ingresos (id, categoria_id, monto, fecha, fuente, descripcion) VALUES
('ingreso_04', 'cat_i_01', 1500000, '2025-03-05', 'transferencia', 'Sueldo de marzo'),
('ingreso_05', 'cat_i_07', 300000, '2025-03-05', 'transferencia', 'Bono de desempeño'),
('ingreso_06', 'cat_i_02', 200000, '2025-03-15', 'transferencia', 'Asesoría técnica');

-- Febrero 2025
INSERT INTO ingresos (id, categoria_id, monto, fecha, fuente, descripcion) VALUES
('ingreso_07', 'cat_i_01', 1500000, '2025-02-05', 'transferencia', 'Sueldo de febrero'),
('ingreso_08', 'cat_i_02', 320000, '2025-02-18', 'transferencia', 'Proyecto diseño web'),
('ingreso_09', 'cat_i_06', 100000, '2025-02-25', 'efectivo', 'Regalo de cumpleaños');

-- Movimientos de ahorro
INSERT INTO movimientos_ahorro (id, monto, fecha, origen, destino, meta_id, comentario) VALUES
('ahorro_01', 150000, '2025-04-06', 'cuenta corriente', 'cuenta ahorro', 'meta_01', 'Ahorro mensual para fondo de emergencia'),
('ahorro_02', 200000, '2025-04-06', 'cuenta corriente', 'cuenta ahorro', 'meta_02', 'Ahorro mensual para viaje'),
('ahorro_03', 300000, '2025-04-06', 'cuenta corriente', 'cuenta ahorro', 'meta_03', 'Ahorro mensual para departamento'),
('ahorro_04', 150000, '2025-03-06', 'cuenta corriente', 'cuenta ahorro', 'meta_01', 'Ahorro mensual para fondo de emergencia'),
('ahorro_05', 200000, '2025-03-06', 'cuenta corriente', 'cuenta ahorro', 'meta_02', 'Ahorro mensual para viaje'),
('ahorro_06', 300000, '2025-03-06', 'cuenta corriente', 'cuenta ahorro', 'meta_03', 'Ahorro mensual para departamento'),
('ahorro_07', 150000, '2025-02-06', 'cuenta corriente', 'cuenta ahorro', 'meta_01', 'Ahorro mensual para fondo de emergencia'),
('ahorro_08', 200000, '2025-02-06', 'cuenta corriente', 'cuenta ahorro', 'meta_02', 'Ahorro mensual para viaje'),
('ahorro_09', 300000, '2025-02-06', 'cuenta corriente', 'cuenta ahorro', 'meta_03', 'Ahorro mensual para departamento');

-- Recomendaciones generadas por el sistema
INSERT INTO recomendaciones (id, tipo, mensaje, fecha) VALUES
('recom_01', 'ahorro', 'Considera aumentar tu ahorro mensual para alcanzar tu meta de viaje a Europa antes de la fecha objetivo.', '2025-04-20'),
('recom_02', 'gasto', 'Tus gastos en entretenimiento han aumentado un 25% respecto al mes anterior. Podrías revisar este ítem si quieres aumentar tu capacidad de ahorro.', '2025-04-21'),
('recom_03', 'ingreso', 'Has tenido ingresos variables por honorarios en los últimos meses. Considera guardar parte de estos ingresos extra para tus metas prioritarias.', '2025-04-22'),
('recom_04', 'general', 'Es un buen momento para revisar tus seguros y evaluar si tienes la cobertura adecuada para tus necesidades actuales.', '2025-04-23'),
('recom_05', 'gasto', 'Tu gasto en servicios básicos está por encima del promedio para un hogar similar. Podrías revisar opciones para reducir el consumo.', '2025-03-15');

-- Resumen mensual
INSERT INTO resumen_mensual (mes, total_gastos, total_ingresos, total_ahorro, ahorro_neto, categorias) VALUES
('2025-04', 1140000, 1825000, 650000, 685000, '{"gastos":{"vivienda":450000,"alimentacion":205000,"transporte":85000,"servicios":78000,"salud":32000,"entretencion":65000,"deudas":150000,"ropa":75000},"ingresos":{"sueldo":1500000,"honorarios":250000,"inversiones":75000}}'),
('2025-03', 1080000, 2000000, 650000, 920000, '{"gastos":{"vivienda":450000,"alimentacion":220000,"transporte":92000,"servicios":83000,"entretencion":85000,"deudas":150000},"ingresos":{"sueldo":1500000,"honorarios":200000,"bonos":300000}}'),
('2025-02', 1382000, 1920000, 650000, 538000, '{"gastos":{"vivienda":450000,"alimentacion":240000,"transporte":55000,"servicios":89000,"entretencion":48000,"deudas":150000,"educacion":350000},"ingresos":{"sueldo":1500000,"honorarios":320000,"otros":100000}}');

-- Metadata del sistema
INSERT INTO metadata (clave, valor) VALUES 
('ultima_sincronizacion', '2025-04-25T13:30:00.000Z'),
('version_datos', '1.2.0'),
('ultimo_analisis', '2025-04-24T10:15:00.000Z');
