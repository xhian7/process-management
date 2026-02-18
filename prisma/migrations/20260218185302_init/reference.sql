CREATE TYPE "phase_material_types" AS ENUM (
  'INPUT',
  'OUTPUT'
);

CREATE TYPE "group_types" AS ENUM (
  'RECIPE',
  'PROCEDURE',
  'UNIT_PROCEDURE',
  'OPERATION'
);

CREATE TYPE "execution_status" AS ENUM (
  'DISPATCHED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELED'
);

CREATE TABLE "materials" (
  "id" VARCHAR(50) PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "uom" VARCHAR(20)
);

CREATE TABLE "phases" (
  "id" INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "target_execution_time" NUMERIC(10, 2),
  "instructions" TEXT,
  "is_building_block" BOOLEAN DEFAULT FALSE
);

CREATE TABLE "phase_materials" (
  "id" INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "phase_id" INTEGER NOT NULL,
  "material_id" VARCHAR(50) NOT NULL,
  "quantity_relation" NUMERIC(10, 4),
  "uom" VARCHAR(20),
  "type" phase_material_types NOT NULL
);

CREATE TABLE "equipments" (
  "id" VARCHAR(50) PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "class" VARCHAR(50),
  "is_class" BOOLEAN DEFAULT FALSE
);

CREATE TABLE "equipment_parameters" (
  "id" INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "equipment_id" VARCHAR(50) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "type" VARCHAR(50),
  "value_definition" JSONB,
  "uom" VARCHAR(20)
);

CREATE TABLE "phase_equipments" (
  "phase_id" INTEGER NOT NULL,
  "equipment_id" VARCHAR(50) NOT NULL,
  PRIMARY KEY ("phase_id", "equipment_id")
);

CREATE TABLE "phase_equipment_parameters" (
  "id" INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "phase_id" INTEGER NOT NULL,
  "equipment_parameter_id" INTEGER NOT NULL,
  "target_value" VARCHAR(255)
);

CREATE TABLE "groups" (
  "id" VARCHAR(50) PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "type" group_types NOT NULL,
  "target_execution_time" NUMERIC(10, 2),
  "base_quantity" NUMERIC(10, 4),
  "uom" VARCHAR(20),
  "procedure_logic" JSONB,
  "is_building_block" BOOLEAN DEFAULT FALSE
);

CREATE TABLE "group_phases" (
  "group_id" VARCHAR(50) NOT NULL,
  "phase_id" INTEGER NOT NULL,
  PRIMARY KEY ("group_id", "phase_id")
);

CREATE TABLE "embeded_groups" (
  "parent_group_id" VARCHAR(50) NOT NULL,
  "child_group_id" VARCHAR(50) NOT NULL,
  PRIMARY KEY ("parent_group_id", "child_group_id")
);

CREATE TABLE "batch_executions" (
  "id" INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "batch_id" VARCHAR(50) NOT NULL,
  "start_date" TIMESTAMPTZ,
  "end_date" TIMESTAMPTZ,
  "status" execution_status NOT NULL DEFAULT 'DISPATCHED'
);

CREATE TABLE "batch_execution_phases" (
  "id" INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "batch_id" INTEGER NOT NULL,
  "phase_id" INTEGER NOT NULL,
  "start_date" TIMESTAMPTZ,
  "end_date" TIMESTAMPTZ,
  "execution_time" NUMERIC(10, 2)
);

CREATE TABLE "batch_execution_groups" (
  "id" INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "batch_id" INTEGER NOT NULL,
  "group_id" VARCHAR(50) NOT NULL,
  "start_date" TIMESTAMPTZ,
  "end_date" TIMESTAMPTZ,
  "execution_time" NUMERIC(10, 2)
);

CREATE TABLE "batch_execution_parameters" (
  "execution_phase_id" INTEGER NOT NULL,
  "phase_parameter_id" INTEGER NOT NULL,
  "value" VARCHAR(255),
  PRIMARY KEY ("execution_phase_id", "phase_parameter_id")
);

CREATE TABLE "batch_execution_materials" (
  "execution_phase_id" INTEGER NOT NULL,
  "phase_material_id" INTEGER NOT NULL,
  "value" VARCHAR(255),
  PRIMARY KEY ("execution_phase_id", "phase_material_id")
);

-- Foreign Keys con políticas de integridad referencial
ALTER TABLE "phase_materials" ADD CONSTRAINT fk_phase_materials_phase 
  FOREIGN KEY ("phase_id") REFERENCES "phases" ("id") ON DELETE CASCADE;

ALTER TABLE "phase_materials" ADD CONSTRAINT fk_phase_materials_material 
  FOREIGN KEY ("material_id") REFERENCES "materials" ("id") ON DELETE RESTRICT;

ALTER TABLE "equipments" ADD CONSTRAINT fk_equipments_class 
  FOREIGN KEY ("class") REFERENCES "equipments" ("id") ON DELETE SET NULL;

ALTER TABLE "equipment_parameters" ADD CONSTRAINT fk_equipment_parameters_equipment 
  FOREIGN KEY ("equipment_id") REFERENCES "equipments" ("id") ON DELETE CASCADE;

ALTER TABLE "phase_equipments" ADD CONSTRAINT fk_phase_equipments_phase 
  FOREIGN KEY ("phase_id") REFERENCES "phases" ("id") ON DELETE CASCADE;

ALTER TABLE "phase_equipments" ADD CONSTRAINT fk_phase_equipments_equipment 
  FOREIGN KEY ("equipment_id") REFERENCES "equipments" ("id") ON DELETE CASCADE;

ALTER TABLE "phase_equipment_parameters" ADD CONSTRAINT fk_phase_equipment_parameters_phase 
  FOREIGN KEY ("phase_id") REFERENCES "phases" ("id") ON DELETE CASCADE;

ALTER TABLE "phase_equipment_parameters" ADD CONSTRAINT fk_phase_equipment_parameters_equipment_parameter 
  FOREIGN KEY ("equipment_parameter_id") REFERENCES "equipment_parameters" ("id") ON DELETE CASCADE;

ALTER TABLE "group_phases" ADD CONSTRAINT fk_group_phases_group 
  FOREIGN KEY ("group_id") REFERENCES "groups" ("id") ON DELETE CASCADE;

ALTER TABLE "group_phases" ADD CONSTRAINT fk_group_phases_phase 
  FOREIGN KEY ("phase_id") REFERENCES "phases" ("id") ON DELETE CASCADE;

ALTER TABLE "embeded_groups" ADD CONSTRAINT fk_embeded_groups_parent 
  FOREIGN KEY ("parent_group_id") REFERENCES "groups" ("id") ON DELETE CASCADE;

ALTER TABLE "embeded_groups" ADD CONSTRAINT fk_embeded_groups_child 
  FOREIGN KEY ("child_group_id") REFERENCES "groups" ("id") ON DELETE CASCADE;

ALTER TABLE "batch_execution_phases" ADD CONSTRAINT fk_batch_execution_phases_batch 
  FOREIGN KEY ("batch_id") REFERENCES "batch_executions" ("id") ON DELETE CASCADE;

ALTER TABLE "batch_execution_phases" ADD CONSTRAINT fk_batch_execution_phases_phase 
  FOREIGN KEY ("phase_id") REFERENCES "phases" ("id") ON DELETE RESTRICT;

ALTER TABLE "batch_execution_groups" ADD CONSTRAINT fk_batch_execution_groups_batch 
  FOREIGN KEY ("batch_id") REFERENCES "batch_executions" ("id") ON DELETE CASCADE;

ALTER TABLE "batch_execution_groups" ADD CONSTRAINT fk_batch_execution_groups_group 
  FOREIGN KEY ("group_id") REFERENCES "groups" ("id") ON DELETE RESTRICT;

ALTER TABLE "batch_execution_parameters" ADD CONSTRAINT fk_batch_execution_parameters_execution_phase 
  FOREIGN KEY ("execution_phase_id") REFERENCES "batch_execution_phases" ("id") ON DELETE CASCADE;

ALTER TABLE "batch_execution_parameters" ADD CONSTRAINT fk_batch_execution_parameters_phase_parameter 
  FOREIGN KEY ("phase_parameter_id") REFERENCES "phase_equipment_parameters" ("id") ON DELETE RESTRICT;

ALTER TABLE "batch_execution_materials" ADD CONSTRAINT fk_batch_execution_materials_execution_phase 
  FOREIGN KEY ("execution_phase_id") REFERENCES "batch_execution_phases" ("id") ON DELETE CASCADE;

ALTER TABLE "batch_execution_materials" ADD CONSTRAINT fk_batch_execution_materials_phase_material 
  FOREIGN KEY ("phase_material_id") REFERENCES "phase_materials" ("id") ON DELETE RESTRICT;

-- Índices para mejorar el rendimiento de las foreign keys
-- (Solo se crean índices donde son necesarios, evitando redundancia con PKs existentes)
CREATE INDEX idx_phase_materials_phase_id ON "phase_materials" ("phase_id");
CREATE INDEX idx_phase_materials_material_id ON "phase_materials" ("material_id");
CREATE INDEX idx_equipment_parameters_equipment_id ON "equipment_parameters" ("equipment_id");
-- PK compuesta (phase_id, equipment_id) ya indexa phase_id, solo necesitamos equipment_id
CREATE INDEX idx_phase_equipments_equipment_id ON "phase_equipments" ("equipment_id");
CREATE INDEX idx_phase_equipment_parameters_phase_id ON "phase_equipment_parameters" ("phase_id");
CREATE INDEX idx_phase_equipment_parameters_equipment_parameter_id ON "phase_equipment_parameters" ("equipment_parameter_id");
-- PK compuesta (group_id, phase_id) ya indexa group_id, solo necesitamos phase_id
CREATE INDEX idx_group_phases_phase_id ON "group_phases" ("phase_id");
-- PK compuesta (parent_group_id, child_group_id) ya indexa parent_group_id, solo necesitamos child_group_id
CREATE INDEX idx_embeded_groups_child_group_id ON "embeded_groups" ("child_group_id");
CREATE INDEX idx_batch_execution_phases_batch_id ON "batch_execution_phases" ("batch_id");
CREATE INDEX idx_batch_execution_phases_phase_id ON "batch_execution_phases" ("phase_id");
CREATE INDEX idx_batch_execution_groups_batch_id ON "batch_execution_groups" ("batch_id");
CREATE INDEX idx_batch_execution_groups_group_id ON "batch_execution_groups" ("group_id");
-- PK compuesta ya indexa execution_phase_id, solo necesitamos phase_parameter_id
CREATE INDEX idx_batch_execution_parameters_phase_parameter_id ON "batch_execution_parameters" ("phase_parameter_id");
-- PK compuesta ya indexa execution_phase_id, solo necesitamos phase_material_id
CREATE INDEX idx_batch_execution_materials_phase_material_id ON "batch_execution_materials" ("phase_material_id");

-- Índices adicionales para búsquedas comunes
CREATE INDEX idx_batch_executions_batch_id ON "batch_executions" ("batch_id");
CREATE INDEX idx_batch_executions_status ON "batch_executions" ("status");
CREATE INDEX idx_batch_executions_start_date ON "batch_executions" ("start_date");

-- Índices GIN para columnas JSONB (mejoran consultas JSON y búsquedas de contenido)
-- CREATE INDEX idx_equipment_parameters_value_definition ON "equipment_parameters" USING GIN ("value_definition");
-- CREATE INDEX idx_groups_procedure_logic ON "groups" USING GIN ("procedure_logic");
