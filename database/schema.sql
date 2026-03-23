BEGIN;

DROP TABLE IF EXISTS permisos_perfil CASCADE;
DROP TABLE IF EXISTS menu_modulo CASCADE;
DROP TABLE IF EXISTS usuario CASCADE;
DROP TABLE IF EXISTS modulo CASCADE;
DROP TABLE IF EXISTS perfil CASCADE;
DROP TABLE IF EXISTS menu CASCADE;
DROP TABLE IF EXISTS estado_usuario CASCADE;

CREATE TABLE estado_usuario (
    id              SMALLSERIAL PRIMARY KEY,
    str_nombre      VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE perfil (
    id                  BIGSERIAL PRIMARY KEY,
    str_nombre_perfil   VARCHAR(100) NOT NULL UNIQUE,
    bit_administrador   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE modulo (
    id                  BIGSERIAL PRIMARY KEY,
    str_nombre_modulo   VARCHAR(100) NOT NULL UNIQUE,
    str_clave_modulo    VARCHAR(100) NOT NULL UNIQUE,
    str_ruta            VARCHAR(150) NOT NULL UNIQUE,
    bit_estatico        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE menu (
    id                  BIGSERIAL PRIMARY KEY,
    str_nombre_menu     VARCHAR(100) NOT NULL UNIQUE,
    str_icono           VARCHAR(100),
    int_orden           INT NOT NULL DEFAULT 0,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE menu_modulo (
    id              BIGSERIAL PRIMARY KEY,
    id_menu         BIGINT NOT NULL,
    id_modulo       BIGINT NOT NULL,
    int_orden       INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_menu_modulo_menu
        FOREIGN KEY (id_menu) REFERENCES menu(id) ON DELETE CASCADE,
    CONSTRAINT fk_menu_modulo_modulo
        FOREIGN KEY (id_modulo) REFERENCES modulo(id) ON DELETE CASCADE,
    CONSTRAINT uq_menu_modulo UNIQUE (id_menu, id_modulo)
);

CREATE TABLE usuario (
    id                      BIGSERIAL PRIMARY KEY,
    str_nombre_usuario      VARCHAR(100) NOT NULL UNIQUE,
    id_perfil               BIGINT NOT NULL,
    str_pwd                 VARCHAR(255) NOT NULL,
    id_estado_usuario       SMALLINT NOT NULL,
    str_correo              VARCHAR(150) NOT NULL UNIQUE,
    str_numero_celular      VARCHAR(20),
    str_imagen_usuario      VARCHAR(255),
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_usuario_perfil
        FOREIGN KEY (id_perfil) REFERENCES perfil(id),
    CONSTRAINT fk_usuario_estado
        FOREIGN KEY (id_estado_usuario) REFERENCES estado_usuario(id),
    CONSTRAINT chk_usuario_correo
        CHECK (position('@' in str_correo) > 1),
    CONSTRAINT chk_usuario_celular
        CHECK (
            str_numero_celular IS NULL
            OR str_numero_celular ~ '^[0-9]{10,15}$'
        )
);

CREATE TABLE permisos_perfil (
    id                  BIGSERIAL PRIMARY KEY,
    id_modulo           BIGINT NOT NULL,
    id_perfil           BIGINT NOT NULL,
    bit_agregar         BOOLEAN NOT NULL DEFAULT FALSE,
    bit_editar          BOOLEAN NOT NULL DEFAULT FALSE,
    bit_consulta        BOOLEAN NOT NULL DEFAULT FALSE,
    bit_eliminar        BOOLEAN NOT NULL DEFAULT FALSE,
    bit_detalle         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_permisos_modulo
        FOREIGN KEY (id_modulo) REFERENCES modulo(id) ON DELETE CASCADE,
    CONSTRAINT fk_permisos_perfil
        FOREIGN KEY (id_perfil) REFERENCES perfil(id) ON DELETE CASCADE,
    CONSTRAINT uq_permisos_perfil UNIQUE (id_modulo, id_perfil)
);

CREATE INDEX idx_usuario_id_perfil ON usuario(id_perfil);
CREATE INDEX idx_usuario_id_estado_usuario ON usuario(id_estado_usuario);
CREATE INDEX idx_usuario_nombre ON usuario(str_nombre_usuario);
CREATE INDEX idx_usuario_correo ON usuario(str_correo);

CREATE INDEX idx_modulo_nombre ON modulo(str_nombre_modulo);
CREATE INDEX idx_modulo_clave ON modulo(str_clave_modulo);
CREATE INDEX idx_modulo_ruta ON modulo(str_ruta);

CREATE INDEX idx_perfil_nombre ON perfil(str_nombre_perfil);

CREATE INDEX idx_permisos_id_perfil ON permisos_perfil(id_perfil);
CREATE INDEX idx_permisos_id_modulo ON permisos_perfil(id_modulo);

CREATE INDEX idx_menu_nombre ON menu(str_nombre_menu);
CREATE INDEX idx_menu_modulo_menu ON menu_modulo(id_menu);
CREATE INDEX idx_menu_modulo_modulo ON menu_modulo(id_modulo);

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_perfil_updated_at
BEFORE UPDATE ON perfil
FOR EACH ROW
EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_modulo_updated_at
BEFORE UPDATE ON modulo
FOR EACH ROW
EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_menu_updated_at
BEFORE UPDATE ON menu
FOR EACH ROW
EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_menu_modulo_updated_at
BEFORE UPDATE ON menu_modulo
FOR EACH ROW
EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_usuario_updated_at
BEFORE UPDATE ON usuario
FOR EACH ROW
EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_permisos_perfil_updated_at
BEFORE UPDATE ON permisos_perfil
FOR EACH ROW
EXECUTE FUNCTION fn_set_updated_at();

COMMIT;