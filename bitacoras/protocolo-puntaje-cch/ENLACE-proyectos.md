# Enlace programa → proyectos — flujo de cierre

**Idea de Nequiz (2026-11-18):** los archivos del protocolo quedan guardados para el programa, listos para enlazarlos a los proyectos que haga. Cuando un proyecto está terminado, se genera el reporte y, según el caso, se manda por correo, se exporta en PDF para imprimir, etc. Y cada trabajo lleva sus URLs de referencia, para conocer la estructura de cómo se realizó ese proyecto o trabajo.

## Archivos del programa (listos para enlazar)

| Archivo | Para qué sirve |
|---|---|
| `../docs/historico/protocolo-puntaje-cch-v1.json` | Catálogo de referencia: 158 actividades del JSON del usuario (el Cuadro oficial tiene 165; ver CORRECCIONES.md) |
| `protocolo-puntaje-cch-CORRECCIONES.md` | Qué corrige el Cuadro oficial respecto al JSON |
| `INDICE-plantillas-rubro.md` | Índice rubro → plantilla → destinatario → URLs |
| `plantillas-rubro/rubro-I-apoyo-docencia.md` | Rubro I, 79 actividades |
| `plantillas-rubro/rubro-II-investigacion.md` | Rubro II, 12 actividades |
| `plantillas-rubro/rubro-III-formacion-profesores.md` | Rubro III, 35 actividades |
| `plantillas-rubro/rubro-IV-direccion-grupos.md` | Rubro IV, 7 actividades |
| `plantillas-rubro/rubro-V-difusion-extension.md` | Rubro V, 28 actividades |
| `plantillas-rubro/rubro-VI-participacion-honoraria.md` | Rubro VI, 4 actividades |
| `plantillas-rubro/lista-jerarquizada-horarios.md` | Horarios / lista jerarquizada, 7 criterios |
| `formato-por-defecto.json` (en `files/`) | Estructura simple por defecto si el JSON del proyecto está vacío |
| Este archivo | Flujo de cierre y enlace proyecto → rubro |

## Flujo de cierre de un proyecto

1. **Proyecto terminado** en su bitácora (`#Estadistica1`, `#Estadistica2`, `#CchPage`, etc.): sesiones, acuerdos cerrados y evidencias completas.
2. **Clasificar el trabajo:** ¿a qué rubro y actividad del protocolo corresponde? Ver tabla de enlace abajo. Un mismo proyecto puede dar para más de un rubro, pero un mismo trabajo no se cuenta en dos rubros.
3. **Generar el reporte** desde la interfaz, con el formato cargado de ese proyecto o, si está vacío, con el formato simple por defecto.
4. **Elegir la salida, según el caso:**
   - **Por correo:** machote de correo de la plantilla de su rubro, con asunto, destinatario y anexos en PDF.
   - **Impreso:** exportar a PDF desde la interfaz.
   - **Para compartir / imprimir:** exportar a Word (sobrescribe el `.docx` existente con texto enriquecido) o a Google Docs.
   - **Respaldo:** exportar a JSON y a CSV de pendientes.
5. **Guardar la referencia:** cada reporte lleva sus URLs de referencia (oficiales, verificadas) para consultar después cómo se estructuró ese trabajo.

## Enlace proyecto → rubro (propuesta, no es fija)

| Proyecto (hashtag) | Rubros que más le corresponden | Ejemplo de trabajo |
|---|---|---|
| `#Estadistica1` | I (Apoyo a la Docencia), III (Formación de Profesores) | Paquete didáctico, cuaderno de trabajo, secuencia didáctica |
| `#Estadistica2` | I, III | Paquete didáctico, cuaderno de trabajo, banco de reactivos |
| `#CchPage` | I, III | Material didáctico con uso de software, programa de cómputo para la enseñanza |
| `#ControlFacturas` | — (administrativo, no es producción académica del protocolo) | No se enlaza a un rubro; su reporte es administrativo |
| `#AsistenciaCch` | I | Programa operativo, seguimiento de la experiencia docente |
| `#MoodleDgtic` | I, III | Curso en línea, impartición de cursos en línea, material didáctico con uso de software |
| `#PuntajeCch` (propuesto, sin autorizar) | I–VI (hub) | Bitácora-hub que concentra todos los trabajos por puntaje |

**Regla:** el enlace se confirma por proyecto cuando Nequiz lo pide; no se asume un rubro por el solo nombre del proyecto. Si un trabajo cabe en dos rubros, se elige uno y se anota el otro como referencia, sin doble conteo.

## URLs de referencia (para conocer la estructura de cada trabajo)

- Protocolo de Equivalencias 2020 (Gaceta CCH, PDF oficial): https://gaceta.cch.unam.mx/sites/default/files/2025-12/protocolo_equivalencias_ingreso_promocion_.pdf
- Adenda al Protocolo (Medio Tiempo, 1 junio 2020): https://cch.unam.mx/sites/default/files/suplementoadendo.pdf
- Instructivo de Asignación de Horarios 2023 (Gaceta CCH, PDF oficial): https://gaceta.cch.unam.mx/sites/default/files/2023-03/suplemento_horario.pdf
- Instructivos y Protocolos vigentes (CCH): http://www.cch.unam.mx/instructivos
- Lista jerarquizada (carga de documentos): http://trayectoria.cch.unam.mx

Cada plantilla de rubro trae además sus URLs específicas. Cuando se genera un reporte, esas URLs quedan en el reporte, para consultar después cómo se hizo ese trabajo.
