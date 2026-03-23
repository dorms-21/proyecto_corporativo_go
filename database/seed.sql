BEGIN;

INSERT INTO estado_usuario (id, str_nombre) VALUES
(1, 'ACTIVO'),
(2, 'INACTIVO')
ON CONFLICT (id) DO UPDATE SET str_nombre = EXCLUDED.str_nombre;

SELECT setval(pg_get_serial_sequence('estado_usuario', 'id'), GREATEST((SELECT MAX(id) FROM estado_usuario), 1), true);

INSERT INTO menu (str_nombre_menu, str_icono, int_orden) VALUES
('Seguridad', 'fa-shield', 1),
('Principal 1', 'fa-folder', 2),
('Principal 2', 'fa-folder-open', 3)
ON CONFLICT (str_nombre_menu) DO NOTHING;

INSERT INTO modulo (str_nombre_modulo, str_clave_modulo, str_ruta, bit_estatico) VALUES
('Perfil', 'perfil', '/seguridad/perfil', FALSE),
('Modulo', 'modulo', '/seguridad/modulo', FALSE),
('Permisos-Perfil', 'permisos_perfil', '/seguridad/permisos-perfil', FALSE),
('Usuario', 'usuario', '/seguridad/usuario', FALSE),
('Principal 1.1', 'principal_1_1', '/principal1/principal-1-1', TRUE),
('Principal 1.2', 'principal_1_2', '/principal1/principal-1-2', TRUE),
('Principal 2.1', 'principal_2_1', '/principal2/principal-2-1', TRUE),
('Principal 2.2', 'principal_2_2', '/principal2/principal-2-2', TRUE)
ON CONFLICT (str_clave_modulo) DO NOTHING;

INSERT INTO menu_modulo (id_menu, id_modulo, int_orden)
SELECT me.id, mo.id, x.int_orden
FROM (
    VALUES
    ('Seguridad', 'perfil', 1),
    ('Seguridad', 'modulo', 2),
    ('Seguridad', 'permisos_perfil', 3),
    ('Seguridad', 'usuario', 4),
    ('Principal 1', 'principal_1_1', 1),
    ('Principal 1', 'principal_1_2', 2),
    ('Principal 2', 'principal_2_1', 1),
    ('Principal 2', 'principal_2_2', 2)
) AS x(nombre_menu, clave_modulo, int_orden)
JOIN menu me ON me.str_nombre_menu = x.nombre_menu
JOIN modulo mo ON mo.str_clave_modulo = x.clave_modulo
ON CONFLICT (id_menu, id_modulo) DO NOTHING;

INSERT INTO perfil (str_nombre_perfil, bit_administrador)
VALUES ('Administrador', TRUE)
ON CONFLICT (str_nombre_perfil) DO NOTHING;

INSERT INTO usuario (
    str_nombre_usuario,
    id_perfil,
    str_pwd,
    id_estado_usuario,
    str_correo,
    str_numero_celular,
    str_imagen_usuario
)
SELECT
    'admin',
    p.id,
    '$2a$10$7aI0r1qO8QhD7WkM1Q8G5eD2Yt7z3s6M1hL4iM0e3gC8Kq2M9vT7S',
    1,
    'admin@proyecto.com',
    '7711234567',
    NULL
FROM perfil p
WHERE p.str_nombre_perfil = 'Administrador'
ON CONFLICT (str_nombre_usuario) DO NOTHING;

INSERT INTO permisos_perfil (
    id_modulo,
    id_perfil,
    bit_agregar,
    bit_editar,
    bit_consulta,
    bit_eliminar,
    bit_detalle
)
SELECT
    mo.id,
    pe.id,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE
FROM modulo mo
CROSS JOIN perfil pe
WHERE pe.str_nombre_perfil = 'Administrador'
ON CONFLICT (id_modulo, id_perfil) DO NOTHING;

COMMIT;